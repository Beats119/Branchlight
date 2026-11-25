import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { SettingsStore, type SettingsState } from './settings';
import { getStorage } from '../context';
import { MemoryStorage } from '../domain/store';

const SettingsContext = createContext<SettingsStore | null>(null);

export function useSettings(): SettingsStore {
  const store = useContext(SettingsContext);
  if (!store) throw new Error('useSettings must be used within a SettingsProvider');
  return store;
}

export function useSettingsState(): SettingsState {
  const store = useSettings();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

export function SettingsProvider({
  store: provided,
  children,
}: {
  store?: SettingsStore;
  children: ReactNode;
}) {
  const store = useMemo(() => provided ?? new SettingsStore(getStorage()), [provided]);
  return <SettingsContext.Provider value={store}>{children}</SettingsContext.Provider>;
}
