import { useStore, useBranchlightState } from '../context';
import { getBranchPath } from '../domain/branching';
import { BranchableText } from './BranchableText';
import { Breadcrumbs } from './Breadcrumbs';

/**
 * Full-width, breadcrumbed view for a single branch and its subtree. Used when
 * the inline popovers get deep — the breadcrumb lets you jump to any ancestor.
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
        <div className="focus-view__question">
          <span className="thread__qlabel">You asked</span> {branch.question}
        </div>
        <BranchableText contentId={branch.answer.id} className="prose" />
      </div>
    </div>
  );
}
