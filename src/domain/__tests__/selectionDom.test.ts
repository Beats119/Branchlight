import { describe, it, expect, beforeEach } from 'vitest';
import { getOffsetWithin } from '../../selection/offset';

/**
 * The offset mapping is the trickiest part of selection. These tests run in a
 * real (jsdom) DOM so we exercise the actual TreeWalker logic, not a stub.
 */
function mount(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe('getOffsetWithin', () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('maps an offset inside a single text node', () => {
    root = mount('Hello world');
    const textNode = root.firstChild as Text;
    // offset 6 inside "Hello world" should be the space before "world".
    expect(getOffsetWithin(root, textNode, 6)).toBe(6);
  });

  it('accumulates across multiple text nodes (e.g. nested spans)', () => {
    root = mount('The <b>immune</b> system');
    // "The " = 4 chars, then <b>immune</b> = 6 chars.
    const bText = (root.querySelector('b') as HTMLElement).firstChild as Text;
    expect(getOffsetWithin(root, bText, 3)).toBe(4 + 3); // -> 'u' in immune
  });

  it('returns the total length when the endpoint is the root element', () => {
    root = mount('abc');
    expect(getOffsetWithin(root, root, root.childNodes.length)).toBe(3);
  });

  it('handles an empty element gracefully', () => {
    root = mount('<span></span>');
    expect(getOffsetWithin(root, root, 0)).toBe(0);
  });
});
