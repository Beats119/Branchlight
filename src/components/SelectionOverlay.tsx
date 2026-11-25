import { useRef, useState } from 'react';
import type { SelectionInfo } from '../selection/useTextSelection';

function clampPosition(rect: SelectionInfo['rect'], width: number) {
  const above = rect.top > 96;
  const margin = 12;
  const maxLeft = Math.max(margin, window.innerWidth - width - margin);
  const left = Math.min(Math.max(rect.left, margin), maxLeft);
  const top = above ? rect.top - 12 : rect.bottom + 12;
  const transform = above ? 'translateY(-100%)' : 'none';
  return { left, top, transform, placeAbove: above };
}

function truncate(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Floating pill shown right after a valid selection. */
export function SelectionToolbar({
  selection,
  onAsk,
}: {
  selection: SelectionInfo;
  onAsk: () => void;
}) {
  const pos = clampPosition(selection.rect, 280);
  return (
    <div
      data-ui="true"
      className="sel-toolbar"
      style={{ left: pos.left, top: pos.top, transform: pos.transform }}
      role="toolbar"
      aria-label="Selection actions"
    >
      <span className="sel-toolbar__preview">“{truncate(selection.exactText, 60)}”</span>
      <button type="button" className="sel-toolbar__ask" onClick={onAsk} onMouseDown={(e) => e.preventDefault()}>
        Ask about this
      </button>
    </div>
  );
}

/** Inline composer for the user's question about the selection. */
export function BranchComposer({
  selection,
  onSubmit,
  onCancel,
  submitting: externalSubmitting,
}: {
  selection: SelectionInfo;
  onSubmit: (question: string) => void;
  onCancel: () => void;
  submitting?: boolean;
}) {
  const [question, setQuestion] = useState('');
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const pos = clampPosition(selection.rect, 360);
  const busy = externalSubmitting ?? false;

  function submit() {
    const q = question.trim();
    if (!q || busy) return;
    onSubmit(q);
  }

  return (
    <div
      data-ui="true"
      className="composer"
      style={{ left: pos.left, top: pos.top, transform: pos.transform }}
      role="dialog"
      aria-label="Ask a question about the selection"
    >
      <div className="composer__excerpt">
        <span className="composer__label">Selected</span>
        <span className="composer__quote">“{truncate(selection.exactText, 120)}”</span>
      </div>
      <textarea
        ref={taRef}
        className="composer__input"
        placeholder="Ask a follow-up about this passage…"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
          if (e.key === 'Escape') onCancel();
        }}
        rows={3}
        autoFocus
      />
      <div className="composer__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} onMouseDown={(e) => e.preventDefault()}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={submit}
          disabled={!question.trim() || busy}
        >
          {busy ? 'Thinking…' : 'Add branch'}
        </button>
      </div>
    </div>
  );
}

export function SelectionOverlay({
  selection,
  composing,
  submitting,
  onAsk,
  onCancel,
  onSubmit,
}: {
  selection: SelectionInfo;
  composing: boolean;
  submitting?: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onSubmit: (question: string) => void;
}) {
  if (composing) {
    return <BranchComposer selection={selection} onSubmit={onSubmit} onCancel={onCancel} submitting={submitting} />;
  }
  return <SelectionToolbar selection={selection} onAsk={onAsk} />;
}
