import { ask, selectText } from '../helpers/exploration';
import { test, expect, chromium } from '@playwright/test';
import { browserOptions } from '../../scripts/browser-options';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('native mouse selection → three levels → focus → collapse → reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'How vaccines build immune memory',
  );
  await selectText(page, page.locator('[data-content-id="c_ai_1"]'), 'A vaccine', true);
  await ask(page, 'Explain this simply');
  const root = page.getByRole('region', { name: 'Branch: Explain this simply', exact: true });
  await expect(root.getByText('Demo answer · mock', { exact: true })).toBeVisible();
  await expect(page.locator('[data-content-id="c_ai_1"] mark')).toHaveText('A vaccine');
  await selectText(page, root.locator('[data-content-id]').first(), 'record of invaders');
  await ask(page, 'Give me an example');
  const child = page.getByRole('region', { name: 'Branch: Give me an example', exact: true });
  await selectText(page, child.locator('[data-content-id]').first(), 'virus X');
  await ask(page, 'Why does this matter?');
  await page.getByRole('button', { name: /Continue in focus view: Why does this matter/ }).click();
  await expect(page.getByText('Focus view', { exact: true })).toBeVisible();
  const third = page.getByRole('region', { name: 'Branch: Why does this matter?', exact: true });
  await expect(third.locator('[data-content-id]')).toBeVisible();
  expect((await third.boundingBox())!.width).toBeGreaterThan(600);
  // The previously broken focus-view selection is exercised with a fourth level.
  await selectText(page, third.locator('[data-content-id]'), 'start from scratch');
  await ask(page, 'Explain like I am five');
  await page.getByRole('button', { name: /Back to parent/ }).click();
  await expect(
    page.getByRole('region', { name: 'Branch: Give me an example', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '← Conversation' }).click();
  await root.getByRole('button', { name: '− Collapse', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Give me an example' })).toHaveCount(0);
  await page.reload();
  await expect(root.getByRole('button', { name: '+ Expand', exact: true })).toBeVisible();
  await root.getByRole('button', { name: '+ Expand', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Give me an example' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('keyboard-only passage picker, composer containment, cancel and duplicate guard', async ({
  page,
}) => {
  await page.goto('/');
  // Tab from the document, not locator.focus(), to prove normal keyboard reachability.
  for (let n = 0; n < 20; n++) {
    if (
      await page
        .getByRole('button', { name: /Choose a passage/ })
        .evaluate((el) => el === document.activeElement)
    )
      break;
    await page.keyboard.press('Tab');
  }
  await expect(page.getByRole('button', { name: /Choose a passage/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter'); // first paragraph is initially focused
  await expect(page.getByRole('textbox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.branch')).toHaveCount(0);
  await page.getByRole('button', { name: /Choose a passage/ }).click();
  await page.getByRole('dialog').locator('.passage-option').first().press('Enter');
  await page.getByRole('textbox').fill('Keyboard question');
  await page.keyboard.press('Shift+Tab'); // close button
  await page.keyboard.press('Shift+Tab'); // wrap to submit
  await expect(page.getByRole('button', { name: 'Add branch' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.locator('.branch')).toHaveCount(1);
});

test('responsive controls and modal remain inside viewport', async ({ page }) => {
  await page.goto('/');
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('button', { name: /Choose a passage/ }).click();
    await page.locator('.passage-option').first().click();
    const box = await page.getByRole('dialog').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(800);
    await expect(page.getByRole('button', { name: 'Add branch' })).toBeVisible();
    await page.keyboard.press('Escape');
  }
});

test('broken anchor retains answer but disables passage navigation', async ({ page }) => {
  await page.goto('/');
  await selectText(page, page.locator('[data-content-id="c_ai_1"]'), 'A vaccine');
  await ask(page, 'A saved question');
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('branchlight:state:v1')!);
    s.workspace.conversation.messages[1].content.version++;
    localStorage.setItem('branchlight:state:v1', JSON.stringify(s));
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Anchor unavailable');
  await expect(page.locator('.branch__source')).toBeDisabled();
  await expect(page.locator('.branch [data-content-id]')).toBeVisible();
  await expect(page.locator('[data-content-id="c_ai_1"] mark')).toHaveCount(0);
});

test('reading position returns after focus navigation', async ({ page }) => {
  await page.goto('/');
  await selectText(page, page.locator('[data-content-id="c_ai_1"]'), 'A vaccine');
  await ask(page, 'Remember my place');
  await page
    .getByRole('button', { name: 'Open this branch in focus view' })
    .scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await page.getByRole('button', { name: 'Open this branch in focus view' }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.getByRole('button', { name: '← Conversation' }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(before);
});

test('workspace survives a complete browser-process restart', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'branchlight-e2e-'));
  const options = await browserOptions();
  let context = await chromium.launchPersistentContext(dir, { ...options, headless: true });
  try {
    let page = await context.newPage();
    await page.goto('http://localhost:4173');
    await selectText(page, page.locator('[data-content-id="c_ai_1"]'), 'A vaccine');
    await ask(page, 'Across a real restart');
    await page.getByRole('button', { name: '− Collapse', exact: true }).click();
    await context.close();
    context = await chromium.launchPersistentContext(dir, { ...options, headless: true });
    page = await context.newPage();
    await page.goto('http://localhost:4173');
    await expect(page.getByRole('heading', { name: 'Across a real restart' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Expand', exact: true })).toBeVisible();
  } finally {
    await context.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('selection shortcut, overlapping anchors, source return and export', async ({ page }) => {
  await page.goto('/');
  const source = page.locator('[data-content-id="c_ai_1"]');
  await selectText(page, source, 'A vaccine');
  await page.keyboard.press('Control+Shift+B');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('textbox').fill('First overlapping question');
  await page.getByRole('button', { name: 'Add branch' }).click();
  await selectText(page, source, 'vaccine teaches');
  await ask(page, 'Another question from here');
  await expect(page.locator('.branch')).toHaveCount(2);
  await expect(source).toHaveText(/A vaccine teaches your immune system/);
  await page
    .getByRole('region', { name: 'Branch: Another question from here', exact: true })
    .locator('.branch__source')
    .click();
  await expect(source).toBeFocused();
  await expect(source.locator('mark').first()).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export workspace', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('branchlight-workspace.json');
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  expect(Object.keys(exported.branches)).toHaveLength(2);
  expect(exported.workspace.conversation.messages).toHaveLength(2);
});

test('corrupt saved workspace stays untouched until explicitly reset', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('branchlight:state:v1', '{recover-this'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('could not be restored');
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await page.getByRole('button', { name: 'Keep exploring' }).click();
  expect(await page.evaluate(() => localStorage.getItem('branchlight:state:v1'))).toBe(
    '{recover-this',
  );
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset demo', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('branchlight:state:v1')!).version),
  ).toBe(1);
});
