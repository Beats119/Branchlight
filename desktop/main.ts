import { app, BrowserWindow, Menu, net, protocol, session, dialog } from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { contentSecurityPolicy, rendererOptions, resolveAsset } from './security.js';

app.setName('Branchlight');
protocol.registerSchemesAsPrivileged([
  { scheme: 'branchlight', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);
const directory = join(dirname(fileURLToPath(import.meta.url)), '../dist');

async function createWindow() {
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
    if (url.split('#')[0] !== 'branchlight://app/') event.preventDefault();
  });
  window.once('ready-to-show', () => window.show());
  window.webContents.on('render-process-gone', () => {
    void dialog.showMessageBox(window, {
      type: 'error',
      title: 'Reading view closed unexpectedly',
      message: 'Reopen Branchlight to restore your saved workspace.',
    });
  });
  await window.loadURL('branchlight://app/');
}

void app.whenReady().then(async () => {
  const local = session.fromPartition('persist:branchlight');
  local.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  local.setPermissionCheckHandler(() => false);
  await local.protocol.handle('branchlight', async (request) => {
    const file = resolveAsset(request.url, directory);
    if (!file) return new Response('Not found', { status: 404 });
    try {
      const response = await net.fetch(pathToFileURL(file).toString());
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', contentSecurityPolicy);
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return new Response('Asset unavailable. Run npm run build, then reopen Branchlight.', {
        status: 404,
      });
    }
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
  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
