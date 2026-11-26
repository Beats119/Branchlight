import { test, expect } from '@playwright/test';
import { ask, selectText } from '../helpers/exploration';

for (const backward of [false, true]) {
  test(`native ${backward ? 'backward' : 'forward'} multiline selection preserves the exact passage`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 1000 });
    await page.goto('/');
    const answer = page.locator('[data-content-id="c_ai_1"]');
    const text = (await answer.textContent())!;
    const passage = text.slice(0, text.indexOf('When immune cells') + 'When immune cells'.length);
    await selectText(page, answer, passage, true, backward);
    const toolbar = page.getByRole('toolbar');
    const box = (await toolbar.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await page.getByRole('button', { name: 'Ask about this' }).click();
    await expect(page.locator('.composer blockquote')).toHaveText(`“${passage}”`);
    await page.getByRole('textbox').fill('Follow this whole passage');
    await page.getByRole('button', { name: 'Add branch' }).click();
    const anchor = await page.evaluate(
      () =>
        Object.values(JSON.parse(localStorage.getItem('branchlight:state:v1')!).branches)[0] as {
          anchor: { start: number; end: number; exactText: string };
        },
    );
    expect(anchor.anchor).toMatchObject({ start: 0, end: passage.length, exactText: passage });
  });
}

test('native Unicode and emoji selection keeps UTF-16 offsets after reload', async ({ page }) => {
  await page.goto('/');
  const text =
    'Café naïve — 免疫 🧬 memory cells keep a record. A second encounter can be different.\n\nExplore this explanation without losing your place.';
  const selected = '🧬 memory cells';
  await page.evaluate((text) => {
    const saved = JSON.parse(localStorage.getItem('branchlight:state:v1')!);
    saved.workspace.conversation.messages[1].content.text = text;
    localStorage.setItem('branchlight:state:v1', JSON.stringify(saved));
  }, text);
  await page.reload();
  await selectText(page, page.locator('[data-content-id="c_ai_1"]'), selected, true);
  await ask(page, 'Explain this simply');
  await page.reload();
  await expect(page.locator('[data-content-id="c_ai_1"] mark')).toHaveText(selected);
  expect(
    await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem('branchlight:state:v1')!);
      const branch = Object.values(saved.branches)[0] as {
        anchor: { start: number; end: number; exactText: string; status: string };
      };
      return branch.anchor;
    }),
  ).toMatchObject({
    start: text.indexOf(selected),
    end: text.indexOf(selected) + selected.length,
    exactText: selected,
    status: 'valid',
  });
});

test('compact zoom-equivalent layout lets the composer scroll to every core action', async ({
  page,
}) => {
  // This tests the layout at the CSS viewport corresponding to 200% on 640x800.
  // Actual Electron zoom is a distinct native test, not claimed by this test.
  await page.setViewportSize({ width: 320, height: 400 });
  await page.goto('/');
  await page.getByRole('button', { name: /Choose a passage/ }).click();
  await page.locator('.passage-option').first().click();
  await page.getByRole('textbox').fill('A question at a compact size');
  const submit = page.getByRole('button', { name: 'Add branch' });
  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await submit.click();
  await expect(page.getByRole('heading', { name: 'A question at a compact size' })).toBeVisible();
});

test('a browser storage write failure keeps the branch usable and exportable', async ({ page }) => {
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'branchlight:state:v1')
        throw new DOMException('Injected quota failure', 'QuotaExceededError');
      return set.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Choose a passage/ }).click();
  await page.locator('.passage-option').first().click();
  await page.getByRole('textbox').fill('Do not lose this thought');
  await page.getByRole('button', { name: 'Add branch' }).click();
  await expect(page.getByRole('heading', { name: 'Do not lose this thought' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Changes are not saved');
  const downloading = page.waitForEvent('download');
  await page.locator('.storage-warning').getByRole('button', { name: 'Export workspace' }).click();
  const stream = await (await downloading).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  expect(Object.values(exported.branches)).toEqual([
    expect.objectContaining({ question: 'Do not lose this thought' }),
  ]);
  expect(await page.evaluate(() => localStorage.getItem('branchlight:state:v1'))).toBeNull();
});
