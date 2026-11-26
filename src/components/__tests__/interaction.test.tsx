import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../../App';
import { BranchlightStore, MemoryStorage } from '../../domain/store';
import { makeInput, ASSISTANT_CONTENT_ID } from '../../domain/__tests__/helpers';

function select(el: HTMLElement, start = 0, end = 9, endEl = el) {
  const range = document.createRange();
  const point = (root: HTMLElement, offset: number): [Node, number] => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode()!;
    while (offset > (node.textContent?.length || 0)) {
      offset -= node.textContent!.length;
      node = walker.nextNode()!;
    }
    return [node, offset];
  };
  range.setStart(...point(el, start));
  range.setEnd(...point(endEl, end));
  range.getBoundingClientRect = () => ({
    top: 300,
    bottom: 320,
    left: 200,
    right: 260,
    width: 60,
    height: 20,
    x: 200,
    y: 300,
    toJSON: () => ({}),
  });
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  fireEvent.mouseUp(el);
}
function setupBranch() {
  const store = new BranchlightStore(new MemoryStorage());
  const result = store.createBranch(
    makeInput(store.getSnapshot(), ASSISTANT_CONTENT_ID, 0, 9, 'First question?'),
  );
  if (!result.ok) throw Error('setup');
  return { store, result };
}

describe('integrated selection flow', () => {
  it('creates a branch through the selection composer and cancels without a branch', () => {
    const store = new BranchlightStore(new MemoryStorage());
    const { container } = render(<App store={store} />);
    select(container.querySelector<HTMLElement>(`[data-content-id="${ASSISTANT_CONTENT_ID}"]`)!);
    fireEvent.click(screen.getByRole('button', { name: 'Ask about this' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(Object.keys(store.getSnapshot().branches)).toHaveLength(0);
    select(container.querySelector<HTMLElement>(`[data-content-id="${ASSISTANT_CONTENT_ID}"]`)!);
    fireEvent.click(screen.getByRole('button', { name: 'Ask about this' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Explain this simply' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add branch' }));
    expect(Object.keys(store.getSnapshot().branches)).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Explain this simply' }).closest('.message--assistant'),
    ).toBeTruthy();
  });
  it('allows selection and child creation inside focus view', () => {
    const { store, result } = setupBranch();
    store.setFocus(result.branchId);
    const { container } = render(<App store={store} />);
    select(
      container.querySelector<HTMLElement>(`[data-content-id="${result.branch.answer.id}"]`)!,
      0,
      4,
    );
    expect(screen.getByRole('button', { name: 'Ask about this' })).toBeInTheDocument();
  });
  it('rejects selections spanning two separate answer contents', () => {
    const { store, result } = setupBranch();
    const { container } = render(<App store={store} />);
    select(
      container.querySelector<HTMLElement>(`[data-content-id="${ASSISTANT_CONTENT_ID}"]`)!,
      0,
      4,
      container.querySelector<HTMLElement>(`[data-content-id="${result.branch.answer.id}"]`)!,
    );
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    expect(screen.getByText('Select a passage within one answer at a time.')).toBeInTheDocument();
  });
  it('keeps the composer open when native selection is cleared by typing or scrolling', () => {
    const { container } = render(<App store={new BranchlightStore(new MemoryStorage())} />);
    select(container.querySelector<HTMLElement>(`[data-content-id="${ASSISTANT_CONTENT_ID}"]`)!);
    fireEvent.click(screen.getByRole('button', { name: 'Ask about this' }));
    act(() => {
      window.getSelection()!.removeAllRanges();
      document.dispatchEvent(new Event('selectionchange'));
    });
    fireEvent.scroll(window);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('offers a keyboard passage chooser without requiring a pointer selection', () => {
    render(<App store={new BranchlightStore(new MemoryStorage())} />);
    fireEvent.click(screen.getByRole('button', { name: /choose a passage/i }));
    expect(screen.getByRole('dialog', { name: /choose a passage/i })).toBeInTheDocument();
  });
});

describe('bounded branch navigation', () => {
  it('uses a focus gateway instead of recursively shrinking deep content', () => {
    const { store, result } = setupBranch();
    let parent = result.branch.answer.id;
    for (let i = 0; i < 5; i++) {
      const r = store.createBranch(makeInput(store.getSnapshot(), parent, 0, 4, `Level ${i + 2}`));
      if (!r.ok) throw Error('setup');
      parent = r.branch.answer.id;
    }
    const { container } = render(<App store={store} />);
    expect(container.querySelectorAll('.branch').length).toBeLessThanOrEqual(3);
    expect(screen.getByRole('button', { name: /continue in focus view/i })).toBeInTheDocument();
  });
  it('shows the exact selected text as a persistent highlight', () => {
    const { store } = setupBranch();
    const { container } = render(<App store={store} />);
    expect(
      container.querySelector<HTMLElement>(`[data-content-id="${ASSISTANT_CONTENT_ID}"] mark`),
    ).toHaveTextContent('A vaccine');
  });
  it('can return directly to the parent branch', () => {
    const { store, result } = setupBranch();
    const r = store.createBranch(
      makeInput(store.getSnapshot(), result.branch.answer.id, 0, 4, 'Child question?'),
    );
    if (!r.ok) throw Error('setup');
    store.setFocus(r.branchId);
    render(<App store={store} />);
    fireEvent.click(screen.getByRole('button', { name: /back to parent/i }));
    expect(store.getSnapshot().ui.focusedBranchId).toBe(result.branchId);
  });
});

it('moves keyboard focus to the new context heading after focus navigation', () => {
  const { store } = setupBranch();
  render(<App store={store} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open this branch in focus view' }));
  expect(screen.getByRole('heading', { name: 'Follow the thought.' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: '← Conversation' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
});

it('returns to the selected answer when the keyboard shortcut composer is cancelled', () => {
  const { container } = render(<App store={new BranchlightStore(new MemoryStorage())} />);
  const answer = container.querySelector<HTMLElement>(
    `[data-content-id="${ASSISTANT_CONTENT_ID}"]`,
  )!;
  select(answer);
  fireEvent.keyDown(document, { key: 'B', ctrlKey: true, shiftKey: true });
  expect(screen.getByRole('textbox')).toHaveFocus();
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
  expect(answer).toHaveFocus();
});
