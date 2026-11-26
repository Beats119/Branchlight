import { useCallback, useEffect, useRef, useState } from 'react';
import { getOffsetWithin } from './offset';

export interface SelectionRect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

export interface SelectionInfo {
  contentId: string;
  start: number;
  end: number;
  exactText: string;
  before: string;
  after: string;
  rect: SelectionRect;
}

const CONTEXT = 24;

/** True when the selection endpoint lives inside our own UI (so we must ignore it). */
function isWithinUI(node: Node | null): boolean {
  let el: Element | null = node instanceof Element ? node : (node?.parentElement ?? null);
  while (el) {
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || el.hasAttribute('data-ui')) return true;
    el = el.parentElement;
  }
  return false;
}

function clearDomSelection(): void {
  try {
    window.getSelection()?.removeAllRanges();
  } catch {
    /* ignore */
  }
}

/**
 * Tracks a text selection inside any registered Content element and turns it
 * into a persisted-anchor-ready SelectionInfo. Selection is centralized here so
 * there is a single source of truth, rather than one listener per text block.
 */
export function useTextSelection() {
  const registry = useRef(new Map<string, { text: string; el: HTMLElement }>());
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [issue, setIssue] = useState<string | null>(null);

  const register = useCallback((id: string, text: string, el: HTMLElement | null) => {
    if (el) registry.current.set(id, { text, el });
    else registry.current.delete(id);
  }, []);
  const unregister = useCallback((id: string) => {
    registry.current.delete(id);
  }, []);

  useEffect(() => {
    function compute(): void {
      setIssue(null);
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelection(null);
        return;
      }
      const text = sel.toString();
      if (!text.trim()) {
        setSelection(null);
        return;
      }
      // Never let our own UI chrome wipe or fake a reading selection.
      if (isWithinUI(sel.anchorNode)) return;

      const range = sel.getRangeAt(0);
      let node: Node | null = range.startContainer;
      let el: HTMLElement | null = null;
      while (node && node !== document.body) {
        if (node instanceof HTMLElement && node.dataset && node.dataset.contentId) {
          el = node;
          break;
        }
        node = node.parentNode;
      }
      if (!el) {
        setSelection(null);
        return;
      }
      const contentId = el.dataset.contentId as string;
      const entry = registry.current.get(contentId);
      if (!entry) {
        setSelection(null);
        return;
      }

      // Both endpoints must belong to the exact same immutable answer.
      const endElement =
        range.endContainer instanceof Element
          ? range.endContainer
          : range.endContainer.parentElement;
      if (endElement?.closest('[data-content-id]') !== el) {
        setIssue('Select a passage within one answer at a time.');
        setSelection(null);
        return;
      }
      const start = getOffsetWithin(el, range.startContainer, range.startOffset);
      const end = getOffsetWithin(el, range.endContainer, range.endOffset);
      if (start >= end) {
        setSelection(null);
        return;
      }

      const exact = entry.text.slice(start, end);
      const before = entry.text.slice(Math.max(0, start - CONTEXT), start);
      const after = entry.text.slice(end, Math.min(entry.text.length, end + CONTEXT));
      const rect = range.getBoundingClientRect();

      setSelection({
        contentId,
        start,
        end,
        exactText: exact,
        before,
        after,
        rect: {
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        },
      });
    }

    window.addEventListener('scroll', compute, true);
    window.addEventListener('resize', compute);
    document.addEventListener('mouseup', compute);
    document.addEventListener('keyup', compute);
    document.addEventListener('selectionchange', compute);
    return () => {
      window.removeEventListener('scroll', compute, true);
      window.removeEventListener('resize', compute);
      document.removeEventListener('mouseup', compute);
      document.removeEventListener('keyup', compute);
      document.removeEventListener('selectionchange', compute);
    };
  }, []);

  return { selection, setSelection, register, unregister, clearDomSelection, issue };
}
