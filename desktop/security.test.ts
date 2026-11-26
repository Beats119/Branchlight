// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { rendererOptions, resolveAsset, isAppNavigation, testProfilePath } from './security';
import { join, resolve } from 'node:path';

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
    const directory = resolve('fixture-dist');
    expect(resolveAsset('branchlight://app/', directory)).toBe(join(directory, 'index.html'));
    expect(resolveAsset('branchlight://app/assets/index-123.js', directory)).toBe(
      join(directory, 'assets/index-123.js'),
    );
    for (const url of [
      'https://evil.test/',
      'branchlight://other/',
      'branchlight://app/%2e%2e%2fsecret',
      'branchlight://app/assets/%2e%2e%2fsecret.js',
      'branchlight://app/assets/..%5csecret.js',
      'branchlight://app/package.json',
    ]) {
      expect(resolveAsset(url, directory)).toBeNull();
    }
  });
});

describe('navigation and test-profile isolation', () => {
  it('allows only the fixed application document and its in-page fragments', () => {
    expect(isAppNavigation('branchlight://app/#reading')).toBe(true);
    expect(isAppNavigation('branchlight://app/')).toBe(true);
    for (const url of [
      'https://example.com',
      'branchlight://app/assets/app.js',
      'branchlight://app/?remote=true',
      'branchlight://user@app/',
      'not a URL',
    ]) {
      expect(isAppNavigation(url)).toBe(false);
    }
  });
  it('accepts an absolute test profile only in explicitly opted-in unpackaged runs', () => {
    const path = resolve('test-results/isolated-profile');
    const env = { BRANCHLIGHT_E2E: '1', BRANCHLIGHT_TEST_USER_DATA_DIR: path };
    expect(testProfilePath(env, false)).toBe(path);
    expect(testProfilePath(env, true)).toBeNull();
    expect(testProfilePath({ ...env, BRANCHLIGHT_E2E: '0' }, false)).toBeNull();
    expect(
      testProfilePath({ ...env, BRANCHLIGHT_TEST_USER_DATA_DIR: './relative' }, false),
    ).toBeNull();
  });
});
