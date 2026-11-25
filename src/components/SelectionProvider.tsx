import { useEffect, useState, type ReactNode } from 'react';
import { useTextSelection, type SelectionInfo } from '../selection/useTextSelection';
import { useStore, useBranchlightState } from '../context';
import { mockAnswer } from '../domain/mockAi';
import { SelectionContext } from '../context';
import { SelectionOverlay } from './SelectionOverlay';

/**
 * Owns the live text selection, renders the floating toolbar/composer overlay,
 * and turns an "Ask" action into a persisted branch via the store. Keeps the
 * selection registry available to SelectableText through SelectionContext.
 */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const { selection, setSelection, register, unregister, clearDomSelection } = useTextSelection();
  const store = useStore();
  const state = useBranchlightState();
  const [composing, setComposing] = useState(false);

  // Drop a stale floating control when the page scrolls underneath it.
  useEffect(() => {
    if (!selection) return;
    const onScroll = () => setSelection(null);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [selection, setSelection]);

  const handleAsk = () => setComposing(true);

  const handleCancel = () => {
    setComposing(false);
    clearDomSelection();
    setSelection(null);
  };

  const handleSubmit = (question: string) => {
    if (!selection) return;
    const result = store.createBranch({
      parentContentId: selection.contentId,
      start: selection.start,
      end: selection.end,
      exactText: selection.exactText,
      before: selection.before,
      after: selection.after,
      question,
      answerText: mockAnswer(selection.exactText, question),
      mock: true,
    });
    if (result.ok) {
      setComposing(false);
      clearDomSelection();
      setSelection(null);
    }
  };

  return (
    <SelectionContext.Provider value={{ register, unregister }}>
      {children}
      {selection && !state.ui.focusedBranchId && (
        <SelectionOverlay
          selection={selection}
          composing={composing}
          onAsk={handleAsk}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      )}
    </SelectionContext.Provider>
  );
}
