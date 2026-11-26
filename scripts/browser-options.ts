import chromium from '@sparticuz/chromium';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { brotliDecompressSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

// Optional test-only runtime for restricted Linux CI. The regular developer
// path uses Playwright's own Chromium. No flags here reach the shipped app.
export async function browserOptions() {
  if (!process.env.SANDBOX_CHROMIUM) return {};
  const root = resolve('.cache/browser-libs');
  try {
    await access(join(root, 'lib/libnspr4.so'));
  } catch {
    await mkdir(root, { recursive: true });
    const require = createRequire(import.meta.url);
    const packageRoot = dirname(dirname(require.resolve('@sparticuz/chromium')));
    const buffer = brotliDecompressSync(await readFile(join(packageRoot, 'bin/al2023.tar.br')));
    const archive = join(root, 'al2023.tar');
    await writeFile(archive, buffer);
    execFileSync('tar', ['xf', archive, '-C', root]);
  }
  process.env.LD_LIBRARY_PATH = `${join(root, 'lib')}:${process.env.LD_LIBRARY_PATH || ''}`;
  return {
    executablePath: await chromium.executablePath(),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote'],
  };
}
