import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import App from '../../App';
import { SelectionToolbar, BranchComposer } from '../../components/SelectionOverlay';
import { BranchlightStore, MemoryStorage } from '../../domain/store';
import { seedState } from '../../domain/sampleData';
import { createBranch } from '../../domain/branching';
import { makeInput, ASSISTANT_CONTENT_ID } from '../../domain/__tests__/helpers';
import type { PersistedState } from '../../domain/types';
import type { SelectionInfo } from '../../selection/useTextSelection';

function buildStateWithBranches(): PersistedState {
  let state = seedState();
  const r1 = createBranch(state, makeInput(state, ASSISTANT_CONTENT_ID, 0, 9, 'What is this about?'));
  if (!r1.ok) throw new Error('r1 failed');
  state = r1.state;
  const r2 = createBranch(state, makeInput(state, r1.branch.answer.id, 0, 4, 'And nested?'));
  if (!r2.ok) throw new Error('r2 failed');
  return r2.state;
}

const fakeSelection: SelectionInfo = {
  contentId: ASSISTANT_CONTENT_ID,
  start: 0,
  end: 9,
  exactText: 'A vaccine',
  before: '',
  after: ' teaches',
  rect: { top: 200, left: 100, bottom: 220, right: 200, width: 100, height: 20 },
};

describe('App — reading view', () => {
  beforeEach(() => cleanup());

  it('renders the user question and the assistant answer', () => {
    render(<App store={new BranchlightStore(new MemoryStorage())} />);
    expect(screen.getByText(/Can you explain how vaccines/i)).toBeInTheDocument();
    expect(screen.getByText(/A vaccine teaches your immune system/i)).toBeInTheDocument();
  });

  it('renders a branch inline with its excerpt, question, and a mock answer label', () => {
    const store = new BranchlightStore(new MemoryStorage(), buildStateWithBranches());
    render(<App store={store} />);
    // Parent branch
    expect(screen.getByText('What is this about?')).toBeInTheDocument();
    // Mock answer badge (one per branch; there are two branches here)
    expect(screen.getAllByText(/Demo answer · mock/i).length).toBeGreaterThanOrEqual(1);
    // Nested child branch
    expect(screen.getByText('And nested?')).toBeInTheDocument();
  });

  it('collapses a branch, hiding its nested children, then reopens', () => {
    const store = new BranchlightStore(new MemoryStorage(), buildStateWithBranches());
    render(<App store={store} />);
    const parentBranch = screen.getByText('What is this about?').closest('.branch') as HTMLElement;
    expect(within(parentBranch).getByText('And nested?')).toBeInTheDocument();

    // The parent branch contains a nested child branch, so scope to the parent's own control.
    fireEvent.click(within(parentBranch).getAllByRole('button', { name: /collapse/i })[0]);
    expect(screen.queryByText('And nested?')).not.toBeInTheDocument();

    fireEvent.click(within(parentBranch).getByRole('button', { name: /expand/i }));
    expect(screen.getByText('And nested?')).toBeInTheDocument();
  });

  it('shows a recoverable warning when an anchor no longer matches its source', () => {
    const r1 = createBranch(seedState(), makeInput(seedState(), ASSISTANT_CONTENT_ID, 0, 9, 'Q1'));
    if (!r1.ok) throw new Error('branch failed');
    const corrupted = JSON.parse(JSON.stringify(r1.state)) as PersistedState;
    // Simulate the source text being edited after the branch existed.
    corrupted.workspace.conversation.messages[1].content.text = 'COMPLETELY DIFFERENT SOURCE';

    const store = new BranchlightStore(new MemoryStorage(), corrupted);
    render(<App store={store} />);
    expect(screen.getByText(/source passage could not be found/i)).toBeInTheDocument();
  });
});

describe('App — persistence across restart', () => {
  it('keeps branches after the store is recreated from the same storage', () => {
    const storage = new MemoryStorage();
    const first = new BranchlightStore(storage);
    const res = createBranch(
      first.getSnapshot(),
      makeInput(first.getSnapshot(), ASSISTANT_CONTENT_ID, 0, 9, 'Persisted question?'),
    );
    expect(res.ok).toBe(true);
    first.createBranch(makeInput(first.getSnapshot(), ASSISTANT_CONTENT_ID, 0, 9, 'Persisted question?'));

    cleanup();
    const second = new BranchlightStore(storage);
    render(<App store={second} />);
    expect(screen.getByText('Persisted question?')).toBeInTheDocument();
  });
});

describe('SelectionOverlay pieces', () => {
  beforeEach(() => cleanup());

  it('SelectionToolbar invokes Ask', () => {
    const onAsk = vi.fn();
    render(<SelectionToolbar selection={fakeSelection} onAsk={onAsk} />);
    fireEvent.click(screen.getByRole('button', { name: /ask about this/i }));
    expect(onAsk).toHaveBeenCalledTimes(1);
  });

  it('BranchComposer submits a non-empty question and cancels without submitting', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<BranchComposer selection={fakeSelection} onSubmit={onSubmit} onCancel={onCancel} />);

    const textarea = screen.getByPlaceholderText(/ask a follow-up/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Why does this matter?' } });
    fireEvent.click(screen.getByRole('button', { name: /add branch/i }));
    expect(onSubmit).toHaveBeenCalledWith('Why does this matter?');

    // Fresh composer: cancel must not call submit.
    const onSubmit2 = vi.fn();
    cleanup();
    render(<BranchComposer selection={fakeSelection} onSubmit={onSubmit2} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onSubmit2).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });
});
