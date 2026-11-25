import type { ReactNode } from 'react';
import { useStore, useTheme } from '../context';

function confirmReset(): boolean {
  try {
    return typeof window.confirm === 'function'
      ? window.confirm('Reset the demo? This clears the branches you have created.')
      : true;
  } catch {
    return true;
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const store = useStore();

  const onReset = () => {
    if (confirmReset()) store.reset();
  };

  return (
    <div className="app-shell">
      <header className="app-bar">
        <div className="brand">
          <span className="brand__mark" aria-hidden>
            ❋
          </span>
          <span className="brand__name">Branchlight</span>
          <span className="brand__tag">Follow every question.</span>
        </div>
        <div className="app-bar__actions">
          <button type="button" className="ghost-btn" onClick={onReset}>
            Reset demo
          </button>
          <button
            type="button"
            className="ghost-btn ghost-btn--icon"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            title="Toggle theme"
          >
            {theme === 'light' ? '◑' : '☀'}
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
