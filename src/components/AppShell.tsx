import { useRef, useState, type ReactNode } from 'react';
import { useStore, useTheme } from '../context';
import { SettingsPanel } from './SettingsPanel';

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onReset = () => {
    if (confirmReset()) store.reset();
  };

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const pages = isPdf
        ? await (await import('../documents/pdf')).extractPdfText(file)
        : [await file.text()];
      store.createDocumentConversation(file.name, pages.length ? pages : ['']);
    } catch (err) {
      console.error(err);
      window.alert('Could not read that file. Try a .txt, .md, or PDF.');
    } finally {
      setBusy(false);
    }
  }

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
          <button
            type="button"
            className="ghost-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            {busy ? 'Reading…' : 'Upload'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,text/plain,application/pdf"
            onChange={onFile}
            hidden
            data-ui="true"
          />
          <button type="button" className="ghost-btn" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
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

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
