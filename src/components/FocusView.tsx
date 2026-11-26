import { useStore, useBranchlightState } from '../context';
import { findContainer, getBranchPath } from '../domain/branching';
import { BranchView } from './BranchView';
import { Breadcrumbs } from './Breadcrumbs';

export function FocusView({ branchId }: { branchId: string }) {
  const store = useStore();
  const state = useBranchlightState();
  const branch = state.branches[branchId];
  if (!branch) return null;
  const parent = findContainer(state, branch.parentContentId);
  return (
    <div className="focus-view">
      <div className="focus-view__intro">
        <span className="eyebrow">A CLOSER LOOK</span>
        <span className="focus-badge">Focus view</span>
      </div>
      <h1 className="conversation__title" tabIndex={-1}>
        Follow the thought.
      </h1>
      <p className="conversation__hint">
        A little more room for your next question. Your original explanation is right where you left
        it.
      </p>
      <Breadcrumbs
        path={getBranchPath(state, branchId)}
        onNavigate={(id) => store.setFocus(id)}
        onExit={() => store.setFocus(null)}
      />
      <button
        className="text-btn back-parent"
        onClick={() => store.setFocus(parent?.kind === 'branch' ? parent.branch.id : null)}
      >
        ← Back to parent context
      </button>
      <div className="focus-view__main">
        <BranchView branchId={branchId} depth={0} />
      </div>
    </div>
  );
}
