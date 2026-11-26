import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTextSelection, type SelectionInfo } from '../selection/useTextSelection';
import { useStore, SelectionContext } from '../context';
import { getContentById } from '../domain/branching';
import { mockAnswer } from '../domain/mockAi';
import { SelectionOverlay } from './SelectionOverlay';
import { Modal } from './ui/Modal';

export function SelectionProvider({ children }: { children: ReactNode }) {
  const { selection, setSelection, register, unregister, clearDomSelection, issue } =
    useTextSelection();
  const store = useStore();
  // Freeze the domain-ready selection as soon as composing begins. Typing,
  // scrolling and native selectionchange must never destroy the draft.
  const [draft, setDraft] = useState<SelectionInfo | null>(null);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const submitted = useRef(false);
  const returnTo = useRef<HTMLElement | null>(null);

  const cancel = useCallback(() => {
    setDraft(null);
    setChoosing(null);
    setSelection(null);
    setError(null);
    clearDomSelection();
    returnTo.current?.focus({ preventScroll: true });
  }, [setSelection, clearDomSelection]);

  const beginDraft = useCallback(() => {
    if (!selection) return;
    returnTo.current = document.querySelector(`[data-content-id="${selection.contentId}"]`);
    submitted.current = false;
    setDraft(selection);
  }, [selection]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'b' &&
        selection &&
        !draft
      ) {
        e.preventDefault();
        beginDraft();
      }
    };
    const outside = (e: PointerEvent) => {
      if (!draft && !(e.target as Element).closest('[data-ui], [data-content-id]'))
        setSelection(null);
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', key);
      document.removeEventListener('pointerdown', outside);
    };
  }, [selection, draft, cancel, setSelection, beginDraft]);

  const choosePassage = useCallback(
    (id: string) => {
      returnTo.current = document.activeElement as HTMLElement;
      setSelection(null);
      setChoosing(id);
    },
    [setSelection],
  );
  const registry = useMemo(
    () => ({ register, unregister, choosePassage }),
    [register, unregister, choosePassage],
  );
  const content = choosing ? getContentById(store.getSnapshot(), choosing) : null;

  const submit = (question: string) => {
    if (!draft || submitted.current) return;
    submitted.current = true;
    const result = store.createBranch({
      ...draft,
      parentContentId: draft.contentId,
      question,
      answerText: mockAnswer(draft.exactText, question),
      mock: true,
    });
    if (!result.ok) {
      submitted.current = false;
      setError('This passage is no longer available. Cancel and choose it again.');
      return;
    }
    setAnnouncement(`Branch created: ${question}`);
    cancel();
    requestAnimationFrame(() => {
      const branch = document.getElementById(`branch-${result.branchId}`);
      branch?.scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
      branch?.focus({ preventScroll: true });
    });
  };

  return (
    <SelectionContext.Provider value={registry}>
      {children}
      {issue && !draft && (
        <div className="selection-notice" role="status">
          {issue}
        </div>
      )}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
      {(draft || selection) && (
        <SelectionOverlay
          selection={(draft || selection)!}
          composing={!!draft}
          onAsk={beginDraft}
          onCancel={cancel}
          onSubmit={submit}
          error={error}
        />
      )}
      {content && (
        <Modal label="Choose a passage" onClose={cancel} className="passage-picker">
          <span className="eyebrow">A NEW DIRECTION</span>
          <h2>Where are you curious?</h2>
          <p>
            Choose a paragraph to explore. Or close this and select any word directly in the answer.
          </p>
          <div className="passage-options">
            {Array.from(content.text.matchAll(/[^\n]+/g)).map((match, i) => (
              <button
                className="passage-option"
                key={match.index}
                onClick={() => {
                  const start = match.index!;
                  setDraft({
                    contentId: content.id,
                    start,
                    end: start + match[0].length,
                    exactText: match[0],
                    before: content.text.slice(Math.max(0, start - 24), start),
                    after: content.text.slice(
                      start + match[0].length,
                      start + match[0].length + 24,
                    ),
                    rect: {
                      top: 200,
                      bottom: 220,
                      left: window.innerWidth / 2 - 180,
                      right: 0,
                      width: 0,
                      height: 20,
                    },
                  });
                  submitted.current = false;
                  setChoosing(null);
                }}
              >
                <span className="passage-option__number">{String(i + 1).padStart(2, '0')}</span>
                <span>{match[0]}</span>
                <span aria-hidden>↗</span>
              </button>
            ))}
          </div>
          <button className="btn btn--ghost" onClick={cancel}>
            Cancel
          </button>
        </Modal>
      )}
    </SelectionContext.Provider>
  );
}
