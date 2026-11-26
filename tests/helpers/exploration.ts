import { expect, type Page, type Locator } from '@playwright/test';

export async function selectText(
  page: Page,
  target: Locator,
  text: string,
  pointer = false,
  backward = false,
) {
  await target.scrollIntoViewIfNeeded();
  const points = await target.evaluate((el, text) => {
    const source = el.textContent!;
    const start = source.indexOf(text);
    if (start < 0) throw Error(`Missing passage: ${text}`);
    const point = (offset: number): [Node, number] => {
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node = walk.nextNode()!;
      while (offset > node.textContent!.length) {
        offset -= node.textContent!.length;
        node = walk.nextNode()!;
      }
      return [node, offset];
    };
    const range = document.createRange();
    range.setStart(...point(start));
    range.setEnd(...point(start + text.length));
    const rects = range.getClientRects();
    const first = rects[0],
      last = rects[rects.length - 1];
    // Setting a Range exercises native selection events too; the first flow
    // additionally drags the mouse using the measured glyph coordinates.
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    return {
      x1: first.left + 0.5,
      y1: first.top + first.height / 2,
      x2: last.right,
      y2: last.top + last.height / 2,
    };
  }, text);
  if (pointer) {
    const from = backward ? { x: points.x2, y: points.y2 } : { x: points.x1, y: points.y1 };
    const to = backward ? { x: points.x1, y: points.y1 } : { x: points.x2, y: points.y2 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 15 });
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe(text);
  }
  await expect(page.getByRole('button', { name: 'Ask about this' })).toBeVisible();
}
export async function ask(page: Page, question: string) {
  await page.getByRole('button', { name: 'Ask about this' }).click();
  await expect(page.getByRole('textbox', { name: 'Your question' })).toBeFocused();
  await page.getByRole('textbox').fill(question);
  await page.getByRole('textbox').press('ControlOrMeta+Enter');
  await expect(page.getByRole('dialog')).not.toBeVisible();
}
