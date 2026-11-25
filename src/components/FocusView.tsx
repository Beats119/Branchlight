import { useStore, useBranchlightState } from '../context';
import { getBranchPath } from '../domain/branching';
import { BranchView } from './BranchView';
import { Breadcrumbs } from './Breadcrumbs';

/**
 * Full-width, breadcrumbed view for a single branch and its subtree. Used when
 * inline nesting gets deep, so the main reading column never shrinks to nothing.
 */
export function FocusView({ branchId }: { branchId: string }) {
  const store = useStore();
  const state = useBranchlightState();
  const branch = state.branches[branchId];
  if (!branch) return null;

  const path = getBranchPath(state, branchId);

  return (
    <div className="focus-view">
      <Breadcrumbs
        path={path}
        onNavigate={(id) => store.setFocus(id)}
        onExit={() => store.setFocus(null)}
      />
      <div className="focus-view__main">
        <BranchView branchId={branchId} depth={0} />
      </div>
    </div>
  );
}
