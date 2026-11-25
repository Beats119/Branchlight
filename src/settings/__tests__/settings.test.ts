import { describe, it, expect, vi } from 'vitest';
import { SettingsStore } from '../../settings/settings';
import { MemoryStorage } from '../../domain/store';
import type { ProviderConfig } from '../../domain/providers/types';

describe('SettingsStore', () => {
  const cfg: ProviderConfig = { id: 'openai', apiKey: 'sk-secret', model: 'gpt-4o-mini' };

  it('defaults to no provider and speech enabled', () => {
    const s = new SettingsStore(new MemoryStorage());
    expect(s.getSnapshot().provider).toBeNull();
    expect(s.getSnapshot().speechEnabled).toBe(true);
  });

  it('persists the provider config to storage', () => {
    const storage = new MemoryStorage();
    const s = new SettingsStore(storage);
    s.setProvider(cfg);
    expect(s.getSnapshot().provider).toEqual(cfg);
    expect(storage.getItem('branchlight:settings:v1')).toContain('sk-secret');
  });

  it('reloads provider config from the same storage', () => {
    const storage = new MemoryStorage();
    new SettingsStore(storage).setProvider(cfg);
    const reloaded = new SettingsStore(storage);
    expect(reloaded.getSnapshot().provider?.apiKey).toBe('sk-secret');
  });

  it('clearing the provider removes it', () => {
    const s = new SettingsStore(new MemoryStorage());
    s.setProvider(cfg);
    s.setProvider(null);
    expect(s.getSnapshot().provider).toBeNull();
  });

  it('notifies subscribers on change', () => {
    const s = new SettingsStore(new MemoryStorage());
    const fn = vi.fn();
    const unsub = s.subscribe(fn);
    s.setSpeechEnabled(false);
    expect(fn).toHaveBeenCalled();
    unsub();
  });
});
