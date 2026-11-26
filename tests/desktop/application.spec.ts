import { test, expect, _electron as electron } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ask, selectText } from '../helpers/exploration';

async function launch(profile: string) {
  await mkdir(profile, { recursive: true });
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined) env[key] = value;
  // An enclosing development tool may use this variable; it must not make the
  // Electron binary run as Node. No application sandbox flag is disabled.
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: [resolve('desktop-dist/main.js')],
    env: {
      ...env,
      BRANCHLIGHT_E2E: '1',
      BRANCHLIGHT_TEST_USER_DATA_DIR: profile,
    },
  });
  try {
    // Fail closed BEFORE any writes if test-profile isolation ever regresses.
    if ((await app.evaluate(({ app }) => app.getPath('userData'))) !== profile) {
      throw new Error('Refusing desktop tests: isolated profile was not selected.');
    }
    const page = await app.firstWindow();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    return { app, page };
  } catch (error) {
    await app.close().catch(() => {});
    throw error;
  }
}

test('native boot uses the isolated local origin, secure renderer and normal menus', async ({}, info) => {
  const { app, page } = await launch(info.outputPath('profile'));
  try {
    expect(page.url()).toBe('branchlight://app/');
    expect(
      await page.evaluate(() => ({ node: 'require' in window, process: 'process' in window })),
    ).toEqual({ node: false, process: false });
    const runtime = await app.evaluate(({ app, BrowserWindow, Menu }) => ({
      sandboxed: app
        .getAppMetrics()
        .find(
          (metric) => metric.pid === BrowserWindow.getAllWindows()[0].webContents.getOSProcessId(),
        )?.sandboxed,
      menuRoles: Menu.getApplicationMenu()?.items.flatMap(
        (item) => item.submenu?.items.map((child) => child.role?.toLowerCase()) || [],
      ),
    }));
    // Electron exposes OS sandbox metrics on Windows/macOS, not Linux.
    if (process.platform !== 'linux') expect(runtime.sandboxed).toBe(true);
    expect(runtime.menuRoles).toContain('copy');
    expect(runtime.menuRoles).toContain('zoomin');
    await expect(page.locator('[data-content-id="c_ai_1"]')).toBeVisible();
  } finally {
    await app.close();
  }
});

test('native recursive branching, focus and collapse survive a full app restart', async ({}, info) => {
  const profile = info.outputPath('profile');
  let running = await launch(profile);
  try {
    let { page } = running;
    await selectText(page, page.locator('[data-content-id="c_ai_1"]'), 'A vaccine', true);
    await ask(page, 'Explain this simply');
    const root = page.getByRole('region', { name: 'Branch: Explain this simply', exact: true });
    await selectText(page, root.locator('[data-content-id]').first(), 'record of invaders');
    await ask(page, 'Give me an example');
    const child = page.getByRole('region', { name: 'Branch: Give me an example', exact: true });
    await selectText(page, child.locator('[data-content-id]').first(), 'virus X');
    await ask(page, 'Why does this matter?');
    await page.getByRole('button', { name: /Continue in focus view/ }).click();
    await expect(page.getByText('Focus view', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '− Collapse', exact: true }).click();
    await running.app.close();
    running = await launch(profile);
    page = running.page;
    await expect(page.getByText('Focus view', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Why does this matter?' })).toBeVisible();
    await page.getByRole('button', { name: '+ Expand', exact: true }).click();
    await expect(page.locator('.branch [data-content-id]')).toBeVisible();
    await page.getByRole('button', { name: /Back to parent/ }).click();
    await expect(page.getByRole('heading', { name: 'Give me an example' })).toBeVisible();
    await page.getByRole('button', { name: '← Conversation' }).click();
    await expect(page.locator('[data-content-id="c_ai_1"] mark')).toHaveText('A vaccine');
  } finally {
    await running.app.close();
  }
});

test('native renderer denies popups and external link navigation', async ({}, info) => {
  const { app, page } = await launch(info.outputPath('profile'));
  try {
    const requests: string[] = [];
    page.on('request', (request) => {
      if (/^https?:/.test(request.url())) requests.push(request.url());
    });
    await page.evaluate(() => {
      window.open('https://example.invalid/', '_blank');
      const link = document.createElement('a');
      link.href = 'https://example.invalid/';
      link.textContent = 'test external link';
      document.body.append(link);
      link.click();
      link.remove();
    });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(page.url()).toBe('branchlight://app/');
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
    expect(requests).toEqual([]);
  } finally {
    await app.close();
  }
});

test('native workspace JSON export contains the saved branches', async ({}, info) => {
  const { app, page } = await launch(info.outputPath('profile'));
  try {
    const destination = info.outputPath('export.json');
    // Test-runner-only hook chooses an output file, not the user's Downloads.
    // Native save-dialog interaction remains on the manual checklist.
    await app.evaluate(({ session }, path) => {
      session
        .fromPartition('persist:branchlight')
        .once('will-download', (_event, item) => item.setSavePath(path));
    }, destination);
    await page.getByRole('button', { name: /Choose a passage/ }).click();
    await page.locator('.passage-option').first().click();
    await page.getByRole('textbox').fill('Keep this question');
    await page.getByRole('button', { name: 'Add branch' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export workspace', exact: true }).click();
    await (await download).path();
    const exported = JSON.parse(await readFile(destination, 'utf8'));
    expect(Object.values(exported.branches)).toEqual([
      expect.objectContaining({ question: 'Keep this question' }),
    ]);
  } finally {
    await app.close();
  }
});

test('native window resize and 200 percent zoom keep core controls reachable', async ({}, info) => {
  const { app, page } = await launch(info.outputPath('profile'));
  try {
    await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.setContentSize(1000, 800);
      win.webContents.setZoomFactor(2);
    });
    await expect.poll(() => page.evaluate(() => innerWidth)).toBeLessThanOrEqual(510);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('button', { name: /Choose a passage/ }).click();
    await page.locator('.passage-option').first().click();
    const submit = page.getByRole('button', { name: 'Add branch' });
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  } finally {
    await app.close();
  }
});
