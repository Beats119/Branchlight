import { useEffect, useState, type ReactNode } from 'react';
import { useTextSelection, type SelectionInfo } from '../selection/useTextSelection';
import { useStore, useBranchlightState } from '../context';
import { useSettingsState } from '../settings/SettingsContext';
import { mockAnswer } from '../domain/mockAi';
import { isConfigured, complete, type ChatMessage } from '../domain/providers';
import { SelectionContext } from '../context';
import { SelectionOverlay } from './SelectionOverlay';

function buildMessages(selectedText: string, question: string, parentQuestion?: string): ChatMessage[] {
  const system =
    'You are Branchlight, a focused reading assistant. Answer concisely and clearly, ' +
    'directly addressing the selected passage. Do not merely repeat the passage back.';
  const context = parentQuestion ? `Earlier question in this thread: ${parentQuestion}\n\n` : '';
  const user = `${context}Selected text:\n"""${selectedText}"""\n\nMy question: ${question}`;
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/**
 * Owns the live text selection, renders the floating toolbar/composer overlay,
 * and turns an "Ask" action into a branch. When the user has configured a real
 * provider, the answer comes from that provider; otherwise (or on error) it
 * falls back to the local mock — the app never breaks.
 */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const { selection, setSelection, register, unregister, clearDomSelection } = useTextSelection();
  const store = useStore();
  const state = useBranchlightState();
  const settings = useSettingsState();
  const [composing, setComposing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (question: string) => {
    if (!selection || submitting) return;
    setSubmitting(true);

    let answerText = '';
    let isMock = true;
    if (isConfigured(settings.provider)) {
      try {
        const parentQuestion = Object.values(store.getSnapshot().branches).find(
          (b) => b.answer.id === selection.contentId,
        )?.question;
        answerText = await complete(settings.provider, buildMessages(selection.exactText, question, parentQuestion));
        isMock = false;
      } catch (err) {
        console.warn('Branchlight: provider call failed; using mock answer.', err);
        answerText = mockAnswer(selection.exactText, question);
      }
    } else {
      answerText = mockAnswer(selection.exactText, question);
    }

    const result = store.createBranch({
      parentContentId: selection.contentId,
      start: selection.start,
      end: selection.end,
      exactText: selection.exactText,
      before: selection.before,
      after: selection.after,
      question,
      answerText,
      mock: isMock,
    });

    setSubmitting(false);
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
          submitting={submitting}
          onAsk={handleAsk}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      )}
    </SelectionContext.Provider>
  );
}
