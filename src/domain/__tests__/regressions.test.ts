import { describe, it, expect } from 'vitest';
import { createBranch, validateAllAnchors } from '../branching';
import { seedState } from '../sampleData';
import { BranchlightStore, MemoryStorage, STORAGE_KEY } from '../store';
import { makeInput, ASSISTANT_CONTENT_ID } from './helpers';

describe('anchor trust regressions', () => {
  it('rejects whitespace-only passages even with a valid range', () => {
    const state = seedState();
    state.workspace.conversation.messages[1].content.text = '   ';
    expect(createBranch(state, makeInput(state, ASSISTANT_CONTENT_ID, 0, 3, 'Why?')).ok).toBe(
      false,
    );
  });
  it('detects a changed parent version even if the text is unchanged', () => {
    const result = createBranch(
      seedState(),
      makeInput(seedState(), ASSISTANT_CONTENT_ID, 0, 9, 'Why?'),
    );
    if (!result.ok) throw Error('setup');
    result.state.workspace.conversation.messages[1].content.version++;
    expect(validateAllAnchors(result.state).state.branches[result.branchId].anchor.status).toBe(
      'unavailable',
    );
  });
  it('detects an anchor pointing at a different content id', () => {
    const result = createBranch(
      seedState(),
      makeInput(seedState(), ASSISTANT_CONTENT_ID, 0, 9, 'Why?'),
    );
    if (!result.ok) throw Error('setup');
    result.state.branches[result.branchId].anchor.parentContentId = 'wrong';
    expect(validateAllAnchors(result.state).state.branches[result.branchId].anchor.status).toBe(
      'unavailable',
    );
  });
});

describe('storage failures are visible and non-destructive', () => {
  it('preserves an unreadable stored workspace rather than overwriting it', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{broken');
    const store = new BranchlightStore(storage);
    expect(storage.getItem(STORAGE_KEY)).toBe('{broken');
    expect(store.getStorageError()).toMatch(/could not be restored/i);
  });
  it('reports write failures while keeping the in-memory branch usable', () => {
    const storage = new MemoryStorage();
    const store = new BranchlightStore(storage);
    storage.setItem = () => {
      throw Error('quota');
    };
    store.createBranch(makeInput(store.getSnapshot(), ASSISTANT_CONTENT_ID, 0, 9, 'Why?'));
    expect(Object.keys(store.getSnapshot().branches)).toHaveLength(1);
    expect(store.getStorageError()).toMatch(/not saved/i);
  });
  it('does not overwrite an unsupported future schema', () => {
    const storage = new MemoryStorage();
    const raw = JSON.stringify({ ...seedState(), version: 999 });
    storage.setItem(STORAGE_KEY, raw);
    const store = new BranchlightStore(storage);
    store.toggleCollapse('missing');
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    expect(store.getStorageError()).toBeTruthy();
  });
});

describe('recovery export and corrupt topology', () => {
  it('exports the original unreadable data, not the temporary sample', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{recover-me');
    const store = new BranchlightStore(storage);
    expect(store.exportData()).toBe('{recover-me');
  });
  it('protects the original data if the branch links contain a cycle', () => {
    const result = createBranch(
      seedState(),
      makeInput(seedState(), ASSISTANT_CONTENT_ID, 0, 9, 'Why?'),
    );
    if (!result.ok) throw Error('setup');
    result.branch.childBranchIds.push(result.branchId);
    const storage = new MemoryStorage();
    const raw = JSON.stringify(result.state);
    storage.setItem(STORAGE_KEY, raw);
    const store = new BranchlightStore(storage);
    expect(store.getStorageError()).toMatch(/could not be restored/i);
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  });
  it('detects a branch filed under a different parent than its anchor', () => {
    const result = createBranch(
      seedState(),
      makeInput(seedState(), ASSISTANT_CONTENT_ID, 0, 9, 'Why?'),
    );
    if (!result.ok) throw Error('setup');
    result.state.workspace.conversation.messages[1].branchIds = [];
    result.state.workspace.conversation.messages[0].branchIds.push(result.branchId);
    expect(validateAllAnchors(result.state).state.branches[result.branchId].anchor.status).toBe(
      'unavailable',
    );
  });
});
