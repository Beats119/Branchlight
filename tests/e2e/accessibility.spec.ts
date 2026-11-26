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
