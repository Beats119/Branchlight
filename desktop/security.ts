import { join } from 'node:path';

// No preload/IPC: the mock milestone needs zero privileged renderer capabilities.
export const rendererOptions = {
  sandbox: true,
  contextIsolation: true,
  nodeIntegration: false,
  webSecurity: true,
  webviewTag: false,
} as const;

export function resolveAsset(rawUrl: string, directory: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'branchlight:' || url.host !== 'app' || url.username || url.password)
      return null;
    const path = decodeURIComponent(url.pathname);
    if (path === '/' || path === '/index.html') return join(directory, 'index.html');
    // Bundled flat asset names only. No arbitrary local files or path traversal.
    if (!/^\/assets\/[a-zA-Z0-9_-]+\.(js|css|svg|png|woff2)$/.test(path)) return null;
    return join(directory, path.slice(1));
  } catch {
    return null;
  }
}

export const contentSecurityPolicy =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'";
