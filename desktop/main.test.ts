// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Tests wire the REAL main.ts to fake OS bindings. They do not launch Electron
// and are intentionally reported separately from native desktop E2E.
const fake = await vi.hoisted(async () => {
  const { EventEmitter } = await import('node:events');
  const loadURL = vi.fn(async (_url: string) => {});
  function makeWindow(options: unknown) {
    return Object.assign(new EventEmitter(), {
      options,
      webContents: Object.assign(new EventEmitter(), { setWindowOpenHandler: vi.fn() }),
      show: vi.fn(),
      focus: vi.fn(),
      restore: vi.fn(),
      isMinimized: vi.fn(() => false),
      loadURL,
    });
  }
  const windows: ReturnType<typeof makeWindow>[] = [];
  const BrowserWindow = Object.assign(
    vi.fn(function (options: unknown) {
      const window = makeWindow(options);
      windows.push(window);
      return window;
    }),
    { getAllWindows: vi.fn(() => windows) },
  );
  const app = Object.assign(new EventEmitter(), {
    setName: vi.fn(),
    setPath: vi.fn(),
    isPackaged: false,
    requestSingleInstanceLock: vi.fn(() => true),
    quit: vi.fn(),
    whenReady: vi.fn(async () => {}),
  });
  const local = {
    protocol: { handle: vi.fn() },
    setPermissionRequestHandler: vi.fn(),
    setPermissionCheckHandler: vi.fn(),
    flushStorageData: vi.fn(),
  };
  const dialog = { showErrorBox: vi.fn(), showMessageBox: vi.fn(async () => ({})) };
  return { app, BrowserWindow, windows, loadURL, local, dialog };
});
vi.mock('electron', () => ({
  app: fake.app,
  BrowserWindow: fake.BrowserWindow,
  dialog: fake.dialog,
  Menu: { buildFromTemplate: vi.fn((x) => x), setApplicationMenu: vi.fn() },
  protocol: { registerSchemesAsPrivileged: vi.fn() },
  session: { fromPartition: vi.fn(() => fake.local) },
}));
const boot = async () => {
  await import('./main');
  await vi.dynamicImportSettled();
};

beforeEach(() => {
  vi.resetModules();
  fake.app.removeAllListeners();
  fake.windows.length = 0;
  vi.clearAllMocks();
  fake.app.requestSingleInstanceLock.mockReturnValue(true);
  fake.loadURL.mockResolvedValue(undefined);
});

describe('desktop main-process orchestration (mocked Electron)', () => {
  it('serves the fixed origin through the tested handler and exposes no renderer privileges', async () => {
    await boot();
    expect(fake.local.protocol.handle).toHaveBeenCalledWith('branchlight', expect.any(Function));
    expect(fake.windows[0].options).toMatchObject({
      webPreferences: {
        partition: 'persist:branchlight',
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
    expect(fake.loadURL).toHaveBeenCalledWith('branchlight://app/');
    const handler = fake.local.protocol.handle.mock.calls[0][1];
    const res = await handler({ url: 'https://example.com', method: 'GET' });
    expect(res.status).toBe(404);
  });
  it('denies permission requests, checks, popups and external navigation', async () => {
    await boot();
    const result = vi.fn();
    fake.local.setPermissionRequestHandler.mock.calls[0][0]({}, 'media', result);
    expect(result).toHaveBeenCalledWith(false);
    expect(fake.local.setPermissionCheckHandler.mock.calls[0][0]()).toBe(false);
    const win = fake.windows[0];
    expect(win.webContents.setWindowOpenHandler.mock.calls[0][0]()).toEqual({ action: 'deny' });
    const event = { preventDefault: vi.fn() };
    win.webContents.emit('will-navigate', event, 'https://example.com/');
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });
  it('shows the window only once the renderer is ready', async () => {
    await boot();
    expect(fake.windows[0].show).not.toHaveBeenCalled();
    fake.windows[0].emit('ready-to-show');
    expect(fake.windows[0].show).toHaveBeenCalledOnce();
  });
  it('does not start a second app instance that could overwrite the same workspace', async () => {
    fake.app.requestSingleInstanceLock.mockReturnValue(false);
    await boot();
    expect(fake.app.quit).toHaveBeenCalledOnce();
    expect(fake.BrowserWindow).not.toHaveBeenCalled();
  });
  it('restores and focuses the existing window when another instance starts', async () => {
    await boot();
    const win = fake.windows[0];
    win.isMinimized.mockReturnValue(true);
    fake.app.emit('second-instance');
    expect(win.restore).toHaveBeenCalledOnce();
    expect(win.focus).toHaveBeenCalledOnce();
    expect(fake.windows).toHaveLength(1);
  });
  it('flushes DOM storage on normal quit', async () => {
    await boot();
    fake.app.emit('before-quit');
    expect(fake.local.flushStorageData).toHaveBeenCalledOnce();
  });
  it('reports a failed startup instead of leaving an unhandled rejection and hidden window', async () => {
    fake.loadURL.mockRejectedValueOnce(new Error('missing build'));
    await boot();
    expect(fake.dialog.showErrorBox).toHaveBeenCalledWith(
      'Branchlight could not open',
      expect.stringMatching(/rebuild/i),
    );
    expect(fake.app.quit).toHaveBeenCalledOnce();
  });
  it('reports an unexpected renderer exit but not a normal quit', async () => {
    await boot();
    fake.windows[0].webContents.emit('render-process-gone', {}, { reason: 'crashed' });
    expect(fake.dialog.showMessageBox).toHaveBeenCalledOnce();
    fake.dialog.showMessageBox.mockClear();
    fake.app.emit('before-quit');
    fake.windows[0].webContents.emit('render-process-gone', {}, { reason: 'clean-exit' });
    expect(fake.dialog.showMessageBox).not.toHaveBeenCalled();
  });
});

it('keeps the window open and warns if quit-time storage flushing throws', async () => {
  await boot();
  fake.local.flushStorageData.mockImplementationOnce(() => {
    throw Error('disk unavailable');
  });
  const event = { preventDefault: vi.fn() };
  fake.app.emit('before-quit', event);
  expect(event.preventDefault).toHaveBeenCalledOnce();
  expect(fake.dialog.showErrorBox).toHaveBeenCalledWith(
    'Workspace save interrupted',
    expect.stringMatching(/export/i),
  );
});

it('flushes before the window close button and blocks closing when saving throws', async () => {
  await boot();
  fake.local.flushStorageData.mockImplementationOnce(() => {
    throw Error('disk unavailable');
  });
  const close = { preventDefault: vi.fn() };
  fake.windows[0].emit('close', close);
  expect(close.preventDefault).toHaveBeenCalledOnce();
  expect(fake.dialog.showErrorBox).toHaveBeenCalledWith(
    'Workspace save interrupted',
    expect.stringMatching(/export/i),
  );
});
