import type { Content, SelectionAnchor, AnchorStatus } from './types';

/** How many characters of surrounding context to retain for display/recovery. */
export const CONTEXT_LENGTH = 24;

/**
 * Build a stable anchor for a selection [start, end) inside `parent`.
 * Offsets are UTF-16 code-unit indices (JS string indices).
 */
export function buildAnchor(
  parent: Content,
  start: number,
  end: number,
  contextLength = CONTEXT_LENGTH,
): SelectionAnchor {
  const text = parent.text;
  const s = Math.max(0, Math.floor(start));
  const e = Math.min(text.length, Math.floor(end));
  return {
    parentContentId: parent.id,
    parentVersion: parent.version,
    start: s,
    end: e,
    exactText: text.slice(s, e),
    before: text.slice(Math.max(0, s - contextLength), s),
    after: text.slice(e, Math.min(text.length, e + contextLength)),
    status: 'valid',
  };
}

/**
 * Validate an anchor against the (possibly reloaded) parent text.
 * Returns 'unavailable' for any mismatch so the UI can show a recoverable
 * state instead of attaching a branch to the wrong passage.
 */
export function validateAnchor(parentText: string, anchor: SelectionAnchor): AnchorStatus {
  if (!Number.isInteger(anchor.start) || !Number.isInteger(anchor.end)) return 'unavailable';
  if (anchor.start < 0 || anchor.end > parentText.length) return 'unavailable';
  if (anchor.start >= anchor.end) return 'unavailable';
  if (parentText.slice(anchor.start, anchor.end) !== anchor.exactText) return 'unavailable';
  return 'valid';
}
