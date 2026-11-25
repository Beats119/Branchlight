import type { StorageLike } from '../domain/store';
import type { ProviderConfig } from '../domain/providers/types';

export interface SettingsState {
  /** User-supplied provider config. Stored ONLY in this browser (see StorageLike). */
  provider: ProviderConfig | null;
  /** Enable browser-native read-aloud for thread answers. */
  speechEnabled: boolean;
}

const STORAGE_KEY = 'branchlight:settings:v1';

const DEFAULT: SettingsState = { provider: null, speechEnabled: true };

/**
 * Local-only settings store. Crucially, the provider API key lives here and is
 * NEVER written into the conversation/branch state, so it cannot leak into
 * exports or be synced anywhere. Uses the same StorageLike seam as the branch
 * store (localStorage in the browser, memory in tests).
 */
export class SettingsStore {
  private state: SettingsState;
  private listeners = new Set<() => void>();

  constructor(private storage: StorageLike, initial?: SettingsState) {
    this.state = initial ?? this.load();
  }

  private load(): SettingsState {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as Partial<SettingsState>) };
    } catch {
      /* ignore */
    }
    return { ...DEFAULT };
  }

  private save(state: SettingsState = this.state): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }

  getSnapshot = (): SettingsState => this.state;
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private set(next: SettingsState): void {
    this.state = next;
    this.save(next);
    this.listeners.forEach((l) => l());
  }

  setProvider(cfg: ProviderConfig | null): void {
    this.set({ ...this.state, provider: cfg });
  }

  setSpeechEnabled(value: boolean): void {
    this.set({ ...this.state, speechEnabled: value });
  }
}
