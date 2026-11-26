import { useRef, useState } from 'react';
import type { SelectionInfo } from '../selection/useTextSelection';
import { Modal } from './ui/Modal';
import { Icon } from './ui/Icon';

/** A short toolbar sits below the range, or above it when near the viewport edge. */
export function SelectionToolbar({
  selection,
  onAsk,
}: {
  selection: SelectionInfo;
  onAsk: () => void;
}) {
  const width = Math.min(285, window.innerWidth - 24);
  const left = Math.max(12, Math.min(selection.rect.left, window.innerWidth - width - 12));
  const below = selection.rect.bottom + 10;
  const preferred = below + 54 > window.innerHeight - 12 ? selection.rect.top - 54 : below;
  const top = Math.max(12, Math.min(preferred, window.innerHeight - 62));
  return (
    <div
      data-ui="true"
      className="sel-toolbar"
      style={{ left, top, width }}
      role="toolbar"
      aria-label="Selection actions"
    >
      <button className="sel-toolbar__ask" onClick={onAsk} onMouseDown={(e) => e.preventDefault()}>
        <Icon name="branch" /> Ask about this <span aria-hidden>↗</span>
      </button>
      <kbd title="Control or Command + Shift + B">⌘ ⇧ B</kbd>
    </div>
  );
}

export function BranchComposer({
  selection,
  onSubmit,
  onCancel,
  error,
}: {
  selection: SelectionInfo;
  onSubmit: (question: string) => void;
  onCancel: () => void;
  error?: string | null;
}) {
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  function submit() {
    const q = question.trim();
    if (!q || lock.current) return;
    lock.current = true;
    setSubmitting(true);
    onSubmit(q);
  }
  return (
    <Modal label="Ask a question about the selection" onClose={onCancel} className="composer">
      <div className="composer__heading">
        <span className="eyebrow">
          <Icon name="branch" /> FOLLOW YOUR CURIOSITY
        </span>
        <button className="icon-only" aria-label="Close composer" onClick={onCancel}>
          <Icon name="close" />
        </button>
      </div>
      <h2>Let’s go a little deeper.</h2>
      <div className="composer__excerpt">
        <span className="composer__label">BRANCHING FROM</span>
        <blockquote>“{selection.exactText}”</blockquote>
      </div>
      <label className="input-label" htmlFor="branch-question">
        Your question
      </label>
      <textarea
        id="branch-question"
        data-autofocus
        className="composer__input"
        placeholder="Ask a follow-up about this passage…"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        rows={3}
      />
      {!question && (
        <div className="question-suggestions">
          {['Explain this simply', 'Give me an example', 'Why does this matter?'].map((q) => (
            <button key={q} onClick={() => setQuestion(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <div className="composer__actions">
        <span className="composer__note">A new thread. Same train of thought.</span>
        <button className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn--primary"
          onClick={submit}
          disabled={!question.trim() || (submitting && !error)}
        >
          {submitting && !error ? 'Adding…' : 'Add branch'}
          <Icon name="arrow" />
        </button>
      </div>
      <div className="composer__footnote">Local demo response · no AI service is connected</div>
    </Modal>
  );
}
export function SelectionOverlay({
  selection,
  composing,
  onAsk,
  onCancel,
  onSubmit,
  error,
}: {
  selection: SelectionInfo;
  composing: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onSubmit: (question: string) => void;
  error?: string | null;
}) {
  return composing ? (
    <BranchComposer selection={selection} onSubmit={onSubmit} onCancel={onCancel} error={error} />
  ) : (
    <SelectionToolbar selection={selection} onAsk={onAsk} />
  );
}
