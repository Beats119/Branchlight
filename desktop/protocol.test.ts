// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serveAsset } from './protocol';
import { contentSecurityPolicy } from './security';

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'branchlight-assets-'));
  await mkdir(join(directory, 'assets'));
  await writeFile(join(directory, 'index.html'), '<!doctype html><h1>Branchlight</h1>');
  await writeFile(join(directory, 'assets/app-123.js'), 'console.log("local");');
  await writeFile(join(directory, 'assets/app-123.css'), 'body{color:green}');
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});
const request = (url = 'branchlight://app/', method = 'GET') => ({ url, method });

describe('the actual desktop asset response', () => {
  it('serves HTML with an explicit MIME type, CSP and nosniff', async () => {
    const res = await serveAsset(request(), directory);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('content-security-policy')).toBe(contentSecurityPolicy);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await res.text()).toContain('<h1>Branchlight</h1>');
  });
  it.each([
    ['js', 'text/javascript; charset=utf-8'],
    ['css', 'text/css; charset=utf-8'],
  ])('serves .%s without relying on file-protocol MIME sniffing', async (ext, mime) => {
    const res = await serveAsset(request(`branchlight://app/assets/app-123.${ext}`), directory);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe(mime);
  });
  it('supports HEAD without a response body', async () => {
    const res = await serveAsset(request('branchlight://app/', 'HEAD'), directory);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toBe('');
  });
  it('returns safe errors without reading arbitrary files or leaking local paths', async () => {
    for (const url of [
      'branchlight://app/assets/missing.js',
      'branchlight://other/',
      'branchlight://app/%2e%2e%2fsecret',
      'file:///etc/passwd',
    ]) {
      const res = await serveAsset(request(url), directory);
      expect(res.status).toBe(404);
      expect(res.headers.get('content-security-policy')).toBe(contentSecurityPolicy);
      expect(await res.text()).not.toContain(directory);
    }
  });
  it('rejects non-read methods', async () => {
    const res = await serveAsset(request('branchlight://app/', 'POST'), directory);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, HEAD');
  });
});

it.each([
  ['png', 'image/png'],
  ['woff2', 'font/woff2'],
  ['svg', 'image/svg+xml'],
])('preserves %s asset bytes and MIME type', async (extension, mime) => {
  const bytes = new Uint8Array([0, 127, 128, 255]);
  await writeFile(join(directory, `assets/binary-123.${extension}`), bytes);
  const res = await serveAsset(
    request(`branchlight://app/assets/binary-123.${extension}`),
    directory,
  );
  expect(res.headers.get('content-type')).toBe(mime);
  expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
});
