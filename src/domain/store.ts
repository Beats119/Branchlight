import type { PersistedState, BranchId } from './types';
import {
  createBranch,
  toggleCollapse,
  setFocus,
  validateAllAnchors,
  type CreateBranchInput,
  type CreateBranchResult,
} from './branching';
import { seedState } from './sampleData';
import { isPersistedState } from './validation';

/** Minimal storage abstraction so the domain never depends on a concrete backend. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STORAGE_KEY = 'branchlight:state:v1';

/** In-memory storage for tests and environments without localStorage. */
export class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

/**
 * The runtime store: owns the in-memory state, persists it, and notifies React
 * via the subscribe/getSnapshot pair required by useSyncExternalStore.
 *
 * All transitions go through the pure engine functions in branching.ts, then the
 * result is persisted and subscribers are notified. This keeps persistence and
 * UI concerns out of the domain logic.
 */
export class BranchlightStore {
  private state: PersistedState;
  private storageError: string | null = null;
  private protectedStorage = false;
  private originalData: string | null = null;

  /** A recovery export must preserve the original blob, even if it cannot load. */
  exportData = (): string =>
    this.protectedStorage && this.originalData !== null
      ? this.originalData
      : JSON.stringify(this.state, null, 2);

  getStorageError = (): string | null => this.storageError;
  private listeners = new Set<() => void>();

  constructor(
    private storage: StorageLike,
    initial?: PersistedState,
  ) {
    // Always validate anchors on construction so a branch can never silently
    // point at the wrong passage, whether the state came from storage or was
    // supplied directly (e.g. a rehydrated/seed state).
    this.state = validateAllAnchors(initial ?? this.load()).state;
  }

  private load(): PersistedState {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      this.originalData = raw;
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (!isPersistedState(parsed)) throw new Error('Unsupported workspace');
        return validateAllAnchors(parsed).state;
      }
    } catch {
      this.storageError =
        'Your workspace could not be restored. The original data is untouched. This session is temporary; reset only if you want to replace it.';
      this.protectedStorage = true;
      return seedState();
    }
    const seeded = seedState();
    this.save(seeded);
    return seeded;
  }

  private save(state: PersistedState = this.state): void {
    if (this.protectedStorage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(state));
      this.storageError = null;
    } catch {
      this.storageError =
        'Changes are not saved. Local storage may be full or unavailable. Keep this window open; export your workspace before closing.';
    }
  }

  // useSyncExternalStore contract.
  getSnapshot = (): PersistedState => this.state;
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private set(next: PersistedState): void {
    this.state = next;
    this.save(next);
    this.listeners.forEach((l) => l());
  }

  createBranch(input: CreateBranchInput): CreateBranchResult {
    const result = createBranch(this.state, input);
    if (result.ok) this.set(result.state);
    return result;
  }

  toggleCollapse(branchId: BranchId): void {
    this.set(toggleCollapse(this.state, branchId));
  }

  setFocus(branchId: BranchId | null): void {
    this.set(setFocus(this.state, branchId));
  }

  /** Re-seed the demo (used by the "Reset demo" control). */
  reset(): void {
    this.protectedStorage = false;
    this.set(seedState());
  }
}
