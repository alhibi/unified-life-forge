import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { Plugin, ResolvedConfig } from 'vite';

/**
 * Emit `/sw.js` — an app-shell service worker with a real precache manifest.
 *
 * The app advertised offline support (`display: standalone` in the manifest,
 * and App.tsx toasts «التطبيق يعمل الآن في وضع عدم الاتصال» when the
 * connection drops) but only Google Fonts were ever cached, so reloading
 * offline showed the browser's error page. This closes that gap.
 *
 * The precache list has to come from the build because Vite fingerprints every
 * asset; a hand-written list in `public/` would go stale on the next deploy.
 * The cache version is derived from the bytes of the precached files, so a
 * rebuild that changes nothing does not invalidate a user's cache.
 *
 * This runs in `writeBundle` and reads the emitted `index.html` off disk.
 * `generateBundle` is too early: Vite's own HTML plugin has not added
 * index.html to the bundle at that point, so the manifest would come out empty.
 */
export function appShellServiceWorker(): Plugin {
  const TEMPLATE = path.resolve(import.meta.dirname, 'swTemplate.js');
  let config: ResolvedConfig;

  return {
    name: 'app-shell-service-worker',
    apply: 'build',

    configResolved(resolved) {
      config = resolved;
    },

    writeBundle() {
      const outDir = path.resolve(config.root, config.build.outDir);
      const htmlPath = path.join(outDir, 'index.html');

      if (!fs.existsSync(htmlPath)) {
        this.warn(`${htmlPath} not found — /sw.js was not emitted`);
        return;
      }

      const html = fs.readFileSync(htmlPath, 'utf8');

      // Everything index.html loads up front is what the shell needs offline.
      const referenced = new Set<string>(['/index.html', '/manifest.json']);
      for (const match of html.matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
        const url = match[1];
        if (url.endsWith('.js') || url.endsWith('.css') || url.startsWith('/icons/')) {
          referenced.add(url);
        }
      }

      const entries = [...referenced].sort();

      // Version = hash of the precached bytes, so it only moves when they do.
      const hash = createHash('sha256');
      for (const url of entries) {
        hash.update(url);
        const file = path.join(outDir, url.replace(/^\//, ''));
        if (fs.existsSync(file)) hash.update(fs.readFileSync(file));
      }
      const version = hash.digest('hex').slice(0, 12);

      const code = fs
        .readFileSync(TEMPLATE, 'utf8')
        .replace('__SW_VERSION__', version)
        .replace('__SW_PRECACHE__', JSON.stringify(entries, null, 2));

      if (/__SW_[A-Z_]+__/.test(code)) {
        this.error('sw template placeholders were not all replaced');
      }

      fs.writeFileSync(path.join(outDir, 'sw.js'), code);
       
      console.log(`\n  sw.js emitted — v${version}, ${entries.length} precached entries`);
    },
  };
}
