import {
  app,
  BrowserWindow,
  Menu,
  protocol,
  session,
  dialog,
  type Event as DesktopEvent,
} from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isAppNavigation, rendererOptions, testProfilePath } from './security.js';
import { serveAsset } from './protocol.js';

app.setName('Branchlight');
const profile = testProfilePath(process.env, app.isPackaged);
if (profile) app.setPath('userData', profile);
let quitting = false;
protocol.registerSchemesAsPrivileged([
  { scheme: 'branchlight', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);
const directory = join(dirname(fileURLToPath(import.meta.url)), '../dist');

async function createWindow(flushBeforeClose: (event: DesktopEvent) => void) {
  const window = new BrowserWindow({
    width: 1320,
    height: 920,
    minWidth: 800,
    minHeight: 640,
    title: 'Branchlight — Follow every question.',
    backgroundColor: '#faf9f6',
    show: false,
    webPreferences: { ...rendererOptions, partition: 'persist:branchlight' },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!isAppNavigation(url)) event.preventDefault();
  });
  window.on('close', (event) => {
    if (!quitting) flushBeforeClose(event);
  });
  window.once('ready-to-show', () => window.show());
  window.webContents.on('render-process-gone', (_event, details) => {
    if (quitting || details.reason === 'clean-exit') return;
    void dialog.showMessageBox(window, {
      type: 'error',
      title: 'Reading view closed unexpectedly',
      message: 'Reopen Branchlight to restore your saved workspace.',
    });
  });
  await window.loadURL('branchlight://app/');
}

function failedStartup() {
  dialog.showErrorBox(
    'Branchlight could not open',
    'Rebuild the app with npm run build and npm run build:desktop, then reopen Branchlight. Your saved workspace has not been reset.',
  );
  app.quit();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });
  void app
    .whenReady()
    .then(async () => {
      const local = session.fromPartition('persist:branchlight');
      local.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
      local.setPermissionCheckHandler(() => false);
      local.protocol.handle('branchlight', (request) => serveAsset(request, directory));
      const flush = (event: DesktopEvent) => {
        try {
          local.flushStorageData();
        } catch {
          event.preventDefault();
          quitting = false;
          dialog.showErrorBox(
            'Workspace save interrupted',
            'Branchlight could not finish saving. Keep this window open and export your workspace before trying to quit again.',
          );
        }
      };
      app.on('before-quit', (event) => {
        quitting = true;
        // A last-window close already flushed before removing the renderer.
        if (BrowserWindow.getAllWindows().length > 0) flush(event);
      });
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
          { role: 'fileMenu' },
          { role: 'editMenu' },
          {
            label: 'View',
            submenu: [
              { role: 'reload' },
              { role: 'resetZoom' },
              { role: 'zoomIn' },
              { role: 'zoomOut' },
              { role: 'togglefullscreen' },
            ],
          },
          { role: 'windowMenu' },
        ]),
      );
      await createWindow(flush);
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
          void createWindow(flush).catch(failedStartup);
      });
    })
    .catch(failedStartup);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
