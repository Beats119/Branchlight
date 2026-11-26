import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { contentSecurityPolicy, resolveAsset } from './security.js';

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

/** A small real filesystem boundary, testable without an Electron binary.
 * No file URL fetches, remote origins, MIME guessing, or renderer filesystem API. */
export async function serveAsset(
  request: Pick<Request, 'url' | 'method'>,
  directory: string,
): Promise<Response> {
  const headers = new Headers({
    'Content-Security-Policy': contentSecurityPolicy,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
  });
  const head = request.method === 'HEAD';
  const error = (message: string, status: number) =>
    new Response(head ? null : message, { status, headers });
  if (request.method !== 'GET' && !head) {
    headers.set('Allow', 'GET, HEAD');
    return error('Method not allowed', 405);
  }
  const path = resolveAsset(request.url, directory);
  if (!path) return error('Not found', 404);
  try {
    const bytes = await readFile(path);
    headers.set('Content-Type', mimeTypes[extname(path)]);
    return new Response(head ? null : new Uint8Array(bytes), { headers });
  } catch {
    return error('Local asset unavailable. Rebuild Branchlight and reopen the app.', 404);
  }
}
