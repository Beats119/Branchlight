import { describe, it, expect } from 'vitest';
import type { PersistedState } from '../types';
import { seedState } from '../sampleData';
import {
  createBranch,
  toggleCollapse,
  setFocus,
  getBranchPath,
  getBranchDepth,
  getContentById,
  findContainer,
  validateAllAnchors,
} from '../branching';
import { makeInput, ASSISTANT_CONTENT_ID } from './helpers';

const base = (): PersistedState => seedState();

describe('createBranch — validation', () => {
  it('rejects an empty question', () => {
    const res = createBranch(
      base(),
      makeInput(base(), ASSISTANT_CONTENT_ID, 0, 5, '   '),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('empty-question');
  });

  it('rejects a non-positive range', () => {
    const res = createBranch(base(), makeInput(base(), ASSISTANT_CONTENT_ID, 5, 5, 'why?'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('bad-range');
  });

  it('rejects an unknown parent content id', () => {
    const res = createBranch(base(), {
      parentContentId: 'does-not-exist',
      start: 0,
      end: 1,
      exactText: 'x',
      before: '',
      after: '',
      question: 'why?',
      answerText: 'a',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('parent-not-found');
  });

  it('rejects an anchor whose exactText does not match the parent', () => {
    const res = createBranch(base(), {
      parentContentId: ASSISTANT_CONTENT_ID,
      start: 0,
      end: 4,
      exactText: 'WRONG',
      before: '',
      after: '',
      question: 'why?',
      answerText: 'a',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('invalid-anchor');
  });
});

describe('createBranch — happy path', () => {
  it('creates a branch, attaches it to the message, and keeps state immutable', () => {
    const initial = base();
    const res = createBranch(initial, makeInput(initial, ASSISTANT_CONTENT_ID, 0, 9, 'What is this?'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    // Attached to the assistant message.
    const msg = res.state.workspace.conversation.messages[1];
    expect(msg.branchIds).toContain(res.branchId);

    // The branch carries the selected text, question, and a mock answer.
    expect(res.branch.anchor.exactText).toBe(msg.content.text.slice(0, 9));
    expect(res.branch.question).toBe('What is this?');
    expect(res.branch.answer.text).toBe('Demo answer.');
    expect(res.branch.mock).toBe(true);

    // Original state was not mutated (immutable transition).
    expect(initial.branches).toEqual({});
    expect(initial.workspace.conversation.messages[1].branchIds).toEqual([]);
  });

  it('supports multiple branches from the same passage', () => {
    let state = base();
    const a = createBranch(state, makeInput(state, ASSISTANT_CONTENT_ID, 0, 9, 'Q1'));
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    state = a.state;
    const b = createBranch(state, makeInput(state, ASSISTANT_CONTENT_ID, 0, 9, 'Q2'));
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const msg = b.state.workspace.conversation.messages[1];
    expect(msg.branchIds).toHaveLength(2);
  });

  it('supports nesting: a branch from inside another branch answer', () => {
    const first = createBranch(base(), makeInput(base(), ASSISTANT_CONTENT_ID, 0, 9, 'Q1'));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const childParentId = first.branch.answer.id;
    const second = createBranch(
      first.state,
      makeInput(first.state, childParentId, 0, 4, 'nested?'),
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    // The child is recorded on the parent branch (in the updated state), and
    // its parent is the answer content.
    expect(second.state.branches[first.branchId].childBranchIds).toContain(second.branchId);
    expect(second.branch.parentContentId).toBe(childParentId);
    expect(getContentById(second.state, childParentId)?.text).toBe('Demo answer.');
  });

  it('does not hard-code a maximum depth', () => {
    let state = base();
    let parentId = ASSISTANT_CONTENT_ID;
    const ids: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const res = createBranch(state, makeInput(state, parentId, 0, 3, `level ${i}`));
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      state = res.state;
      ids.push(res.branchId);
      parentId = res.branch.answer.id;
    }
    // 5 branches => depth 4 (message -> b0 -> b1 -> b2 -> b3 -> b4). No hard cap.
    expect(getBranchDepth(state, ids[ids.length - 1])).toBe(4);
  });
});

describe('serialization and persistence shape', () => {
  it('survives a JSON round-trip with anchors intact', () => {
    const res = createBranch(base(), makeInput(base(), ASSISTANT_CONTENT_ID, 0, 9, 'Q1'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const round = JSON.parse(JSON.stringify(res.state)) as PersistedState;

    // Branches map preserved, anchor offsets preserved.
    expect(Object.keys(round.branches)).toHaveLength(1);
    const restored = round.branches[res.branchId];
    expect(restored.anchor.start).toBe(0);
    expect(restored.anchor.end).toBe(9);

    // Creating again after restore still validates.
    const again = createBranch(round, makeInput(round, ASSISTANT_CONTENT_ID, 10, 20, 'Q2'));
    expect(again.ok).toBe(true);
  });
});

describe('navigation helpers', () => {
  it('computes a breadcrumb path and depth for a nested branch', () => {
    const first = createBranch(base(), makeInput(base(), ASSISTANT_CONTENT_ID, 0, 9, 'Q1'));
    if (!first.ok) throw new Error('expected ok');
    const second = createBranch(
      first.state,
      makeInput(first.state, first.branch.answer.id, 0, 4, 'Q2'),
    );
    if (!second.ok) throw new Error('expected ok');

    const path = getBranchPath(second.state, second.branchId);
    expect(path).toHaveLength(2);
    expect(path[0].branchId).toBe(first.branchId);
    expect(path[1].branchId).toBe(second.branchId);
    expect(getBranchDepth(second.state, second.branchId)).toBe(1);
  });

  it('toggleCollapse flips only the targeted branch', () => {
    const res = createBranch(base(), makeInput(base(), ASSISTANT_CONTENT_ID, 0, 9, 'Q1'));
    if (!res.ok) throw new Error('expected ok');
    const toggled = toggleCollapse(res.state, res.branchId);
    expect(toggled.branches[res.branchId].collapsed).toBe(true);
    expect(res.state.branches[res.branchId].collapsed).toBe(false);
  });

  it('setFocus updates the UI focus target', () => {
    const res = createBranch(base(), makeInput(base(), ASSISTANT_CONTENT_ID, 0, 9, 'Q1'));
    if (!res.ok) throw new Error('expected ok');
    const focused = setFocus(res.state, res.branchId);
    expect(focused.ui.focusedBranchId).toBe(res.branchId);
    expect(setFocus(focused, null).ui.focusedBranchId).toBeNull();
  });
});

describe('anchor validation on reload', () => {
  it('marks a branch unavailable when its parent text no longer matches', () => {
    const res = createBranch(base(), makeInput(base(), ASSISTANT_CONTENT_ID, 0, 9, 'Q1'));
    if (!res.ok) throw new Error('expected ok');
    const corrupted: PersistedState = JSON.parse(JSON.stringify(res.state));
    // Simulate an edit/corruption of the source text after the branch existed.
    corrupted.workspace.conversation.messages[1].content.text = 'COMPLETELY DIFFERENT TEXT';
    const { state, brokeIds } = validateAllAnchors(corrupted);
    expect(brokeIds).toContain(res.branchId);
    expect(state.branches[res.branchId].anchor.status).toBe('unavailable');
  });

  it('keeps valid anchors valid', () => {
    const res = createBranch(base(), makeInput(base(), ASSISTANT_CONTENT_ID, 0, 9, 'Q1'));
    if (!res.ok) throw new Error('expected ok');
    const { brokeIds } = validateAllAnchors(res.state);
    expect(brokeIds).toEqual([]);
  });
});

describe('findContainer', () => {
  it('resolves a message body and a branch answer as anchorable containers', () => {
    const res = createBranch(base(), makeInput(base(), ASSISTANT_CONTENT_ID, 0, 9, 'Q1'));
    if (!res.ok) throw new Error('expected ok');
    expect(findContainer(res.state, ASSISTANT_CONTENT_ID)?.kind).toBe('message');
    expect(findContainer(res.state, res.branch.answer.id)?.kind).toBe('branch');
  });
});
