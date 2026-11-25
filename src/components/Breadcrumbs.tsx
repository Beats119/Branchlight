import type { BranchPathNode } from '../domain/types';

function truncate(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function Breadcrumbs({
  path,
  onNavigate,
  onExit,
}: {
  path: BranchPathNode[];
  onNavigate: (branchId: string) => void;
  onExit: () => void;
}) {
  return (
    <nav className="breadcrumbs" aria-label="Branch path">
      <button type="button" className="breadcrumb__exit" onClick={onExit}>
        ← Conversation
      </button>
      {path.map((node, i) => (
        <span key={node.branchId} className="breadcrumb">
          <span className="breadcrumbs__sep" aria-hidden>
            /
          </span>
          <button
            type="button"
            className={`breadcrumb__node${i === path.length - 1 ? ' is-current' : ''}`}
            onClick={() => onNavigate(node.branchId)}
            aria-current={i === path.length - 1 ? 'page' : undefined}
          >
            {truncate(node.question, 42)}
          </button>
        </span>
      ))}
    </nav>
  );
}
