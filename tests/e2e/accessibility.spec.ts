import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('reading view and composer have no automated WCAG A/AA violations in both themes', async ({
  page,
}) => {
  await page.goto('/');
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    let results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.getByRole('button', { name: /Choose a passage/ }).click();
    await page.locator('.passage-option').first().click();
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press('Escape');
  }
});

for (const theme of ['light', 'dark']) {
  test(`branched, focused and narrow reading states pass automated WCAG checks in ${theme} mode`, async ({
    page,
  }) => {
    await page.goto('/');
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.getByRole('button', { name: /Choose a passage/ }).click();
    await page.locator('.passage-option').first().click();
    await page.getByRole('textbox').fill('Explain this simply');
    await page.getByRole('button', { name: 'Add branch' }).click();
    const check = async () => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    };
    await check();
    await page
      .locator('.branch')
      .getByRole('button', { name: /Choose a passage/ })
      .click();
    await page.locator('.passage-option').first().click();
    await page.getByRole('textbox').fill('Why does this matter?');
    await page.getByRole('button', { name: 'Add branch' }).click();
    await page.getByRole('button', { name: 'Open this branch in focus view' }).last().click();
    await check();
    await page.setViewportSize({ width: 390, height: 844 });
    await check();
    await page.getByRole('button', { name: 'How it works', exact: true }).click();
    await check();
  });
}
