import { describe, it, expect } from 'vitest';
import type { Content } from '../types';
import { buildAnchor, validateAnchor, CONTEXT_LENGTH } from '../anchoring';

const makeContent = (text: string, id = 'c1'): Content => ({ id, version: 1, text });

describe('buildAnchor', () => {
  it('captures start, end, exactText, and surrounding context', () => {
    const c = makeContent('The immune system recognizes foreign antigens.');
    // "antigens" starts at index 37 (end exclusive 45).
    const anchor = buildAnchor(c, 37, 45);
    expect(anchor.start).toBe(37);
    expect(anchor.end).toBe(45);
    expect(anchor.exactText).toBe('antigens');
    expect(anchor.before).toBe('stem recognizes foreign ');
    expect(anchor.after).toBe('.');
    expect(anchor.status).toBe('valid');
  });

  it('clamps offsets to the text bounds', () => {
    const c = makeContent('hello');
    const anchor = buildAnchor(c, -5, 100);
    expect(anchor.start).toBe(0);
    expect(anchor.end).toBe(5);
    expect(anchor.exactText).toBe('hello');
  });

  it('records a default context window length', () => {
    const c = makeContent('a'.repeat(100));
    const anchor = buildAnchor(c, 50, 52);
    expect(anchor.before.length).toBeLessThanOrEqual(CONTEXT_LENGTH);
    expect(anchor.after.length).toBeLessThanOrEqual(CONTEXT_LENGTH);
  });
});

describe('validateAnchor', () => {
  it('returns valid when the substring matches', () => {
    const c = makeContent('The immune system recognizes foreign antigens.');
    const anchor = buildAnchor(c, 32, 41);
    expect(validateAnchor(c.text, anchor)).toBe('valid');
  });

  it('returns unavailable when the selected text no longer matches', () => {
    const c = makeContent('The immune system recognizes foreign antigens.');
    const anchor = buildAnchor(c, 32, 41);
    expect(validateAnchor('The text was completely replaced by an edit.', anchor)).toBe(
      'unavailable',
    );
  });

  it('returns unavailable for a reversed or empty range', () => {
    const c = makeContent('abcdef');
    const a = buildAnchor(c, 2, 4);
    expect(validateAnchor(c.text, { ...a, start: 4, end: 2 })).toBe('unavailable');
    expect(validateAnchor(c.text, { ...a, start: 2, end: 2 })).toBe('unavailable');
  });

  it('returns unavailable when offsets fall outside the text', () => {
    const c = makeContent('abc');
    const a = buildAnchor(c, 0, 1);
    expect(validateAnchor(c.text, { ...a, start: 0, end: 99 })).toBe('unavailable');
  });

  it('handles Unicode and emoji using UTF-16 indexing', () => {
    // "café" has 4 UTF-16 units; "😀" is a surrogate pair (2 units at indices 5..7).
    const c = makeContent('café 😀 test');
    const anchor = buildAnchor(c, 5, 7);
    expect(anchor.exactText).toBe('😀');
    expect(validateAnchor(c.text, anchor)).toBe('valid');

    // Emoji length is 2 UTF-16 units, not 1.
    expect(anchor.end - anchor.start).toBe(2);
  });

  it('detects a corrupted exactText even when it contains emoji', () => {
    const c = makeContent('café 😀 test');
    const anchor = buildAnchor(c, 5, 7); // the emoji
    expect(validateAnchor('café 😀 test', anchor)).toBe('valid');
    // If the source text changed so the slice no longer matches exactText:
    expect(validateAnchor('café XX test', anchor)).toBe('unavailable');
  });
});
