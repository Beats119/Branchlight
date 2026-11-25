import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { PersistedState } from './domain/types';
import { BranchlightStore, MemoryStorage, type StorageLike } from './domain/store';

/* ----------------------------- Store context ----------------------------- */

const StoreContext = createContext<BranchlightStore | null>(null);

export function useStore(): BranchlightStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used within a StoreContext provider');
  return store;
}

/** Reactive snapshot of the persisted state (drives re-renders on change). */
export function useBranchlightState(): PersistedState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

export function getStorage(): StorageLike {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const probe = '__bl_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    }
  } catch {
    /* ignore */
  }
  return new MemoryStorage();
}

function getInitialTheme(): 'light' | 'dark' {
  try {
    const stored = window.localStorage.getItem('branchlight:theme');
    if (stored === 'light' || stored === 'dark') return stored;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    /* ignore */
  }
  return 'light';
}

/* ----------------------------- Theme context ----------------------------- */

interface ThemeValue {
  theme: 'light' | 'dark';
  toggle: () => void;
}
const ThemeContext = createContext<ThemeValue | null>(null);

export function useTheme(): ThemeValue {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used within a ThemeContext provider');
  return theme;
}

/* --------------------------- Selection context --------------------------- */

export interface SelectionRegistry {
  register: (id: string, text: string, el: HTMLElement | null) => void;
  unregister: (id: string) => void;
}
export const SelectionContext = createContext<SelectionRegistry | null>(null);

export function useSelection(): SelectionRegistry {
  const reg = useContext(SelectionContext);
  if (!reg) throw new Error('useSelection must be used within a SelectionProvider');
  return reg;
}

/* ------------------------------- Providers ------------------------------- */

export function StoreProvider({
  store: provided,
  children,
}: {
  store?: BranchlightStore;
  children: ReactNode;
}) {
  const store = useMemo(() => provided ?? new BranchlightStore(getStorage()), [provided]);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('branchlight:theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const value = useMemo<ThemeValue>(() => ({ theme, toggle: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
