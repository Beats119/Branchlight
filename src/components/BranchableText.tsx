import { useEffect, useRef } from 'react';
import { useStore, useBranchlightState, useSelection } from '../context';
import { getContentById, branchesForContent } from '../domain/branching';
import type { Branch } from '../domain/types';

function CommentIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M2 3.6C2 2.7 2.7 2 3.6 2h8.8c.9 0 1.6.7 1.6 1.6v5.8c0 .9-.7 1.6-1.6 1.6H6.5L3.4 13.2v-1.8H3.6C2.7 11.4 2 10.7 2 9.8V3.6Z"
      />
    </svg>
  );
}

type Segment = { kind: 'text'; text: string } | { kind: 'hl'; branch: Branch };

/**
 * Split a Content's text into plain segments and highlighted segments for each
 * branch anchored to it. Overlapping ranges are clamped so the rendered DOM text
 * always equals the source text exactly (required for offset accuracy).
 */
function buildSegments(text: string, branches: Branch[]): Segment[] {
  const segs: Segment[] = [];
  let cursor = 0;
  for (const b of branches) {
    const s = Math.max(b.anchor.start, cursor);
    const e = b.anchor.end;
    if (s >= e || s > text.length) continue;
    if (s > cursor) segs.push({ kind: 'text', text: text.slice(cursor, s) });
    segs.push({ kind: 'hl', branch: b });
    cursor = e;
  }
  if (cursor < text.length) segs.push({ kind: 'text', text: text.slice(cursor) });
  return segs;
}

/**
 * Renders one Content (a message body or a branch answer) as selectable text,
 * with every anchored branch shown inline as a highlight + comment marker. The
 * marker toggles a thread popover that itself renders the answer as BranchableText,
 * so nesting is recursive and never shrinks the reading column.
 */
export function BranchableText({ contentId, className }: { contentId: string; className?: string }) {
  const { register, unregister } = useSelection();
  const ref = useRef<HTMLDivElement | null>(null);
  const state = useBranchlightState();
  const content = getContentById(state, contentId);

  useEffect(() => {
    if (!content) return;
    register(content.id, content.text, ref.current);
    return () => unregister(content.id);
  }, [content?.id, content?.text, register, unregister]);

  if (!content) return null;

  const branches = branchesForContent(state, contentId);
  const segments = buildSegments(content.text, branches);

  return (
    <div
      ref={ref}
      data-content-id={content.id}
      className={`selectable${className ? ` ${className}` : ''}`}
    >
      {segments.map((seg, i) =>
        seg.kind === 'text' ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <Highlight key={i} branch={seg.branch} />
        ),
      )}
    </div>
  );
}

function Highlight({ branch }: { branch: Branch }) {
  const store = useStore();
  const state = useBranchlightState();
  const parent = getContentById(state, branch.parentContentId);
  // Render the actual source substring so DOM text stays identical to source.
  const text = parent ? parent.text.slice(branch.anchor.start, branch.anchor.end) : branch.anchor.exactText;
  const open = !branch.collapsed;

  return (
    <span className="hl-wrap">
      <mark className="hl">{text}</mark>
      <button
        type="button"
        className="comment-marker"
        data-ui="true"
        aria-label={`Comment: ${branch.question}`}
        aria-expanded={open}
        onClick={() => store.toggleCollapse(branch.id)}
      >
        <CommentIcon />
      </button>
      {open && <ThreadPopover branch={branch} />}
    </span>
  );
}

function ThreadPopover({ branch }: { branch: Branch }) {
  const anchorOk = branch.anchor.status === 'valid';
  return (
    <div className="thread" role="dialog" aria-label={`Answer to: ${branch.question}`}>
      <div className="thread__question">
        <span className="thread__qlabel">You asked</span>
        {branch.question}
      </div>
      {!anchorOk && (
        <div className="thread__warning" role="alert">
          <span aria-hidden>⚠</span> Source passage not found. Answer kept, link unavailable.
        </div>
      )}
      <div className="thread__answer">
        <BranchableText contentId={branch.answer.id} className="prose--branch" />
        {branch.mock && <span className="mock-badge">Demo answer · mock</span>}
      </div>
    </div>
  );
}
