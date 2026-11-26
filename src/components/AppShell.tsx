import { useState, type ReactNode } from 'react';
import { useStore, useTheme, useBranchlightState } from '../context';
import { getBranchPath } from '../domain/branching';
import { Icon } from './ui/Icon';
import { Modal } from './ui/Modal';

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const store = useStore();
  const state = useBranchlightState();
  const [modal, setModal] = useState<'help' | 'reset' | null>(null);
  const branches = Object.values(state.branches);
  const error = store.getStorageError();
  const exportWorkspace = () => {
    const url = URL.createObjectURL(new Blob([store.exportData()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'branchlight-workspace.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#reading">
        Skip to explanation
      </a>
      <header className="app-bar">
        <a className="brand" href="#reading" aria-label="Branchlight home">
          <span className="brand__mark">
            <Icon name="branch" size={24} />
          </span>
          <span className="brand__name">
            branchlight<span className="brand__period">.</span>
          </span>
          <span className="brand__tag">Follow every question.</span>
        </a>
        <div className="app-bar__actions">
          <span className="local-indicator">
            <span />
            Local workspace
          </span>
          <span className="header-divider" />
          <button
            className="icon-only"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} />
          </button>
          <button
            className="help-button"
            aria-label="How it works"
            onClick={() => setModal('help')}
          >
            <Icon name="help" size={16} />
            <span>How it works</span>
          </button>
          <span className="user-avatar" title="Your local workspace">
            Y
          </span>
        </div>
      </header>
      <div className="workspace-bar">
        <div className="workspace-trail">
          <Icon name="book" size={16} />
          <span>My workspace</span>
          <Icon name="chevron" size={12} />
          <strong>Explorations</strong>
        </div>
        <span className="demo-pill">
          PROTOTYPE <span /> NO API KEY NEEDED
        </span>
      </div>
      {error && (
        <div className="storage-warning" role="alert">
          <span>{error}</span>
          <button className="text-btn" onClick={exportWorkspace}>
            Export workspace
          </button>
        </div>
      )}
      <main className="app-main" id="reading" tabIndex={-1}>
        <div className="workspace-layout">
          <div className="reading-column">{children}</div>
          <aside className="exploration-aside" aria-label="Exploration guide">
            <div className="aside-label">
              <span className="eyebrow">YOUR EXPLORATION</span>
              <span className="count-pill">{branches.length}</span>
            </div>
            <div className="exploration-tree">
              <button
                className={`tree-root ${!state.ui.focusedBranchId ? 'is-active' : ''}`}
                onClick={() => store.setFocus(null)}
              >
                <span className="tree-dot" />
                <span>
                  Immune memory<span className="tree-root__sub">The starting question</span>
                </span>
              </button>
              {branches.length > 0 ? (
                <div className="tree-branches">
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      className={`tree-node ${state.ui.focusedBranchId === b.id ? 'is-active' : ''}`}
                      style={{
                        paddingLeft: Math.min(getBranchPath(state, b.id).length - 1, 3) * 10 + 12,
                      }}
                      onClick={() => store.setFocus(b.id)}
                    >
                      <Icon name="branch" size={14} />
                      <span>{b.question}</span>
                      {b.collapsed && <span aria-label="collapsed">+</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="tree-empty">
                  <span className="tree-empty__line" />
                  <span>
                    Your next question
                    <br />
                    starts a new branch.
                  </span>
                </div>
              )}
            </div>
            <div className="curiosity-note">
              <span className="note-icon">
                <Icon name="leaf" size={25} />
              </span>
              <h2>
                Understanding
                <br />
                grows from here.
              </h2>
              <p>You don’t have to leave a thought behind to follow a new one.</p>
              <div className="guide-step">
                <span>1</span> Highlight something interesting.
              </div>
              <div className="guide-step">
                <span>2</span> Ask the question on your mind.
              </div>
              <div className="guide-step">
                <span>3</span> Explore. Then go a little deeper.
              </div>
              <button className="text-btn" onClick={() => setModal('help')}>
                A quick introduction <span aria-hidden>↗</span>
              </button>
            </div>
            <div className="aside-foot">
              <Icon name="check" size={14} />
              <span>
                {error ? 'Temporary session · not saved' : 'Saved on this device'}
                <small>No account. No cloud. Just your curiosity.</small>
              </span>
            </div>
          </aside>
        </div>
      </main>
      <footer className="app-footer">
        <span>MADE FOR CURIOUS MINDS.</span>
        <div>
          <button onClick={exportWorkspace}>
            <Icon name="download" size={13} /> Export workspace
          </button>
          <span>·</span>
          <button onClick={() => setModal('reset')}>Reset demo</button>
          <span>·</span>
          <span>v0.2 · Local prototype</span>
        </div>
      </footer>
      {modal === 'help' && (
        <Modal label="How Branchlight works" onClose={() => setModal(null)} className="help-modal">
          <span className="eyebrow">LESS SCROLLING. MORE UNDERSTANDING.</span>
          <h2>
            One answer.
            <br />
            Endless directions.
          </h2>
          <p>
            Highlight a word, sentence, or passage inside any demo answer. Choose{' '}
            <strong>Ask about this</strong>, then follow your question in a connected branch.
          </p>
          <p>
            The new answer is selectable too. Keep branching, collapse what you’ve explored, or use{' '}
            <strong>Focus</strong> for a little more room.
          </p>
          <div className="help-keyboard">
            <Icon name="branch" />
            <div>
              <strong>No mouse? No problem.</strong>
              <p>
                Tab to <strong>Choose a passage</strong> beneath any answer. Choose a paragraph,
                type a question, and submit with Ctrl/⌘ + Enter. For a native text selection, use
                Ctrl/⌘ + Shift + B.
              </p>
            </div>
          </div>
          <p className="help-disclaimer">
            All answers are local, scripted demo content—not generated AI or medical advice. Nothing
            leaves this app.
          </p>
          <button className="btn btn--primary" onClick={() => setModal(null)}>
            Let’s explore <Icon name="arrow" />
          </button>
        </Modal>
      )}
      {modal === 'reset' && (
        <Modal label="Reset the demo?" onClose={() => setModal(null)}>
          <span className="eyebrow">A FRESH START</span>
          <h2>Reset this exploration?</h2>
          <p>
            This removes your saved branches on this device. Export your workspace first if you want
            to keep a copy.
          </p>
          <div className="modal-actions">
            <button className="btn btn--ghost" onClick={() => setModal(null)}>
              Keep exploring
            </button>
            <button
              className="btn btn--primary"
              onClick={() => {
                store.reset();
                setModal(null);
              }}
            >
              Reset demo
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
