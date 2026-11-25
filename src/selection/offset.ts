/**
 * Map a DOM (node, offset) selection point to a UTF-16 character offset within
 * `root`. The root is the element that renders a single Content's text, so the
 * returned offset lines up with `Content.text` exactly.
 *
 * Implementation note: we build a Range from the start of `root` to the
 * selection point and measure its text length. This is the most reliable way to
 * respect document order, nested elements, and UTF-16 code units (including
 * surrogate-pair emoji) without manually walking and summing text nodes. The
 * rendered text must equal the source text (the UI renders each Content in one
 * whitespace-preserving element), so the measured length is the correct offset.
 */
export function getOffsetWithin(root: HTMLElement, container: Node, offset: number): number {
  const range = document.createRange();
  range.setStart(root, 0);
  try {
    range.setEnd(container, offset);
  } catch {
    // Defensive: some boundary combinations throw. Fall back to root end.
    range.selectNodeContents(root);
  }
  return range.toString().length;
}
