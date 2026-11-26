import { useStore, useBranchlightState } from '../context';
import { findContainer, getBranchDepth } from '../domain/branching';
import { SelectableText } from './SelectableText';
import { Icon } from './ui/Icon';

export function BranchView({ branchId, depth }: { branchId: string; depth: number }) {
  const store = useStore();
  const state = useBranchlightState();
  const branch = state.branches[branchId];
  if (!branch) return null;
  const anchorOk = branch.anchor.status === 'valid';
  const openSource = () => {
    const parent = findContainer(state, branch.parentContentId);
    store.setFocus(parent?.kind === 'branch' ? parent.branch.id : null);
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-content-id="${branch.parentContentId}"]`,
      );
      const mark = el?.querySelector<HTMLElement>(`[data-anchor-start="${branch.anchor.start}"]`);
      (mark || el)?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
      el?.focus({ preventScroll: true });
    });
  };
  if (depth >= 2)
    return (
      <div className="branch-gateway" id={`branch-${branchId}`} tabIndex={-1}>
        <Icon name="branch" />
        <div>
          <span className="eyebrow">
            KEEP EXPLORING · LEVEL {getBranchDepth(state, branchId) + 1}
          </span>
          <strong>{branch.question}</strong>
        </div>
        <button
          className="btn btn--ghost"
          onClick={() => store.setFocus(branchId)}
          aria-label={`Continue in focus view: ${branch.question}`}
        >
          Continue in focus view <Icon name="arrow" />
        </button>
      </div>
    );
  return (
    <section
      className="branch"
      data-depth={depth}
      id={`branch-${branchId}`}
      tabIndex={-1}
      aria-label={`Branch: ${branch.question}`}
    >
      <div className="branch__bar">
        <span className="branch__level">
          <Icon name="branch" size={15} /> BRANCH{' '}
          {String(getBranchDepth(state, branchId) + 1).padStart(2, '0')}
        </span>
        <div className="branch__actions">
          <button
            className="icon-btn"
            onClick={() => store.setFocus(branchId)}
            aria-label="Open this branch in focus view"
          >
            <Icon name="focus" size={14} /> Focus
          </button>
          <button
            className="icon-btn"
            onClick={() => store.toggleCollapse(branchId)}
            aria-expanded={!branch.collapsed}
          >
            {branch.collapsed ? '+' : '−'} {branch.collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>
      <button
        className="branch__source"
        onClick={openSource}
        disabled={!anchorOk}
        title="Return to this exact passage"
      >
        <span className="branch__source-line" />
        <span>“{branch.anchor.exactText}”</span>
        <span className="branch__source-arrow" aria-hidden>
          ↖
        </span>
      </button>
      <div className="branch__question">
        <span className="branch__qlabel">YOU ASKED</span>
        <h3>{branch.question}</h3>
      </div>
      {!anchorOk && (
        <div className="branch__warning" role="alert">
          Anchor unavailable. This branch’s source passage could not be found. Your question and
          answer are kept; the original link is disabled.
        </div>
      )}
      {!branch.collapsed && (
        <div className="branch__answer">
          {branch.mock && (
            <span className="mock-badge">
              <span />
              Demo answer · mock
            </span>
          )}
          <SelectableText content={branch.answer} className="prose prose--branch" />
          {branch.childBranchIds.length > 0 && (
            <div className="branch-list">
              {branch.childBranchIds.map((id) => (
                <BranchView key={id} branchId={id} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
