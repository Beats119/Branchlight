// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { rendererOptions, resolveAsset } from './security';

describe('desktop trust boundary', () => {
  it('uses a sandboxed, isolated renderer with no Node access or preload bridge', () => {
    expect(rendererOptions).toMatchObject({
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    });
    expect('preload' in rendererOptions).toBe(false);
  });
  it('serves only app HTML and bundled assets from the fixed origin', () => {
    expect(resolveAsset('branchlight://app/', '/app/dist')).toBe('/app/dist/index.html');
    expect(resolveAsset('branchlight://app/assets/index-123.js', '/app/dist')).toBe(
      '/app/dist/assets/index-123.js',
    );
    for (const url of [
      'https://evil.test/',
      'branchlight://other/',
      'branchlight://app/%2e%2e%2fsecret',
      'branchlight://app/assets/%2e%2e%2fsecret.js',
      'branchlight://app/assets/..%5csecret.js',
      'branchlight://app/package.json',
    ]) {
      expect(resolveAsset(url, '/app/dist')).toBeNull();
    }
  });
});
