import { useStore, useBranchlightState } from '../context';
import { SelectableText } from './SelectableText';

function truncate(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Renders one branch: the selected excerpt, the question, the (mock) answer,
 * and any child branches. The branch is attached directly beneath its parent
 * passage so the conversation stays in reading flow rather than moving to the
 * bottom of a chat.
 */
export function BranchView({ branchId, depth }: { branchId: string; depth: number }) {
  const store = useStore();
  const state = useBranchlightState();
  const branch = state.branches[branchId];
  if (!branch) return null;

  const anchorOk = branch.anchor.status === 'valid';
  const capped = Math.min(depth, 5);
  const indent = 16 + capped * 20;

  return (
    <div className="branch" data-depth={depth} style={{ marginLeft: indent }}>
      <div className="branch__bar">
        <span className="branch__excerpt" title={branch.anchor.exactText}>
          “{truncate(branch.anchor.exactText, 90)}”
        </span>
        <div className="branch__actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => store.setFocus(branchId)}
            aria-label="Open this branch in focus view"
          >
            Focus
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => store.toggleCollapse(branchId)}
            aria-expanded={!branch.collapsed}
          >
            {branch.collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>

      <div className="branch__question">
        <span className="branch__qlabel">You asked</span>
        <span className="branch__qtext">{branch.question}</span>
      </div>

      {!anchorOk && (
        <div className="branch__warning" role="alert">
          <span aria-hidden>⚠</span> This branch’s source passage could not be found. The answer is
          kept, but its link to the original text is unavailable.
        </div>
      )}

      {!branch.collapsed && (
        <div className="branch__answer">
          <SelectableText content={branch.answer} className="prose prose--branch" />
          {branch.mock && <span className="mock-badge">Demo answer · mock</span>}
          {branch.childBranchIds.length > 0 && (
            <div className="branch-list">
              {branch.childBranchIds.map((cid) => (
                <BranchView key={cid} branchId={cid} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
