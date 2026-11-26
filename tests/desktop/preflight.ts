import { createRequire } from 'node:module';
import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export default async function preflight() {
  try {
    const require = createRequire(import.meta.url);
    // Resolving package.json does not execute Electron's index.js, which can
    // download a binary as a side effect. A verification command stays offline.
    const root = dirname(require.resolve('electron/package.json'));
    const executable = (await readFile(join(root, 'path.txt'), 'utf8')).trim();
    await access(join(process.env.ELECTRON_OVERRIDE_DIST_PATH || join(root, 'dist'), executable));
  } catch {
    throw new Error(
      'Native Electron tests could not start: the Electron runtime is not installed. Run npm run desktop:install on a machine/network that can download Electron, then npm run test:desktop. No native test has passed or been silently skipped.',
    );
  }
  if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    throw new Error(
      'Native Electron tests need a graphical display on Linux. On a machine with Xvfb installed, use xvfb-run -a npm run test:desktop. Do not disable the application sandbox.',
    );
  }
}
