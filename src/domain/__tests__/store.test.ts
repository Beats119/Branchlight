import { describe, it, expect, vi } from 'vitest';
import { BranchlightStore, MemoryStorage } from '../store';
import { seedState } from '../sampleData';
import { makeInput, ASSISTANT_CONTENT_ID } from './helpers';
import { STORAGE_KEY } from '../store';

describe('BranchlightStore (memory-backed)', () => {
  it('seeds demo data when storage is empty', () => {
    const store = new BranchlightStore(new MemoryStorage());
    const snap = store.getSnapshot();
    expect(snap.workspace.conversation.messages).toHaveLength(2);
    expect(Object.keys(snap.branches)).toHaveLength(0);
  });

  it('persists a created branch to storage', () => {
    const storage = new MemoryStorage();
    const store = new BranchlightStore(storage);
    const res = store.createBranch(
      makeInput(store.getSnapshot(), ASSISTANT_CONTENT_ID, 0, 9, 'Q1'),
    );
    expect(res.ok).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();

    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) as string);
    expect(Object.keys(parsed.branches)).toHaveLength(1);
  });

  it('reloads persisted branches from the same storage', () => {
    const storage = new MemoryStorage();
    const first = new BranchlightStore(storage);
    const res = first.createBranch(
      makeInput(first.getSnapshot(), ASSISTANT_CONTENT_ID, 0, 9, 'Q1'),
    );
    expect(res.ok).toBe(true);

    const second = new BranchlightStore(storage);
    expect(Object.keys(second.getSnapshot().branches)).toHaveLength(1);
  });

  it('notifies subscribers on state changes', () => {
    const store = new BranchlightStore(new MemoryStorage());
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.createBranch(makeInput(store.getSnapshot(), ASSISTANT_CONTENT_ID, 0, 9, 'Q1'));
    expect(listener).toHaveBeenCalled();
    unsub();
    const before = listener.mock.calls.length;
    store.toggleCollapse(Object.keys(store.getSnapshot().branches)[0]);
    expect(listener.mock.calls.length).toBe(before); // unsubscribed
  });

  it('reset returns to the seeded demo state', () => {
    const store = new BranchlightStore(new MemoryStorage());
    store.createBranch(makeInput(store.getSnapshot(), ASSISTANT_CONTENT_ID, 0, 9, 'Q1'));
    expect(Object.keys(store.getSnapshot().branches)).toHaveLength(1);
    store.reset();
    expect(Object.keys(store.getSnapshot().branches)).toHaveLength(0);
  });

  it('can be constructed from an explicit initial state', () => {
    const store = new BranchlightStore(new MemoryStorage(), seedState());
    expect(store.getSnapshot().workspace.conversation.title).toBe(
      'How vaccines build immune memory',
    );
  });
});
