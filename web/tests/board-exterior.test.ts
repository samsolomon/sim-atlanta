import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';
import { expect, it } from 'vitest';

const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(path => path && existsSync(path));
const staged = existsSync('public/data/scene/square-board/brookwood-station/ground.i16');

// Use an isolated localhost origin so Web Crypto can verify the real row assets.
it.skipIf(!chrome || !staged)('keeps City scenery and shadows inside the plinth in the morning render', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'city-exterior-'));
  let report: (value: string) => void;
  const result = new Promise<string>(resolve => { report = resolve; });
  const server = await createServer({
    configFile: false, cacheDir: join(dir, 'vite'), logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [{
      name: 'board-exterior-test',
      transformIndexHtml() {
        return [{ tag: 'script', attrs: { type: 'module' }, children: `
          import { assertBoardExterior } from '/tests/board-exterior.js';
          async function check() {
            let result;
            try {
              while (document.querySelector('#city-info button:last-child')?.textContent !== 'Frame the full board')
                await new Promise(resolve => setTimeout(resolve, 100));
              await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
              result = JSON.stringify(await assertBoardExterior());
            } catch (e) { result = String(e); }
            await fetch('/__exterior-result', {method: 'POST', body: result});
          }
          check();
        ` }];
      },
      configureServer(dev) {
        dev.middlewares.use('/__exterior-result', async (req, res) => {
          let body = '';
          for await (const chunk of req) body += chunk;
          report(body);
          res.end();
        });
      },
    }],
  });
  let browser: ReturnType<typeof spawn> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await server.listen();
    const url = server.resolvedUrls!.local[0] + '?view=city&q=high&t=2026-11-23T08:50:00-05:00&speed=0';
    browser = spawn(chrome!, ['--headless=new', '--no-first-run', '--disable-background-timer-throttling',
      '--user-data-dir=' + join(dir, 'profile'), url], { stdio: 'ignore' });
    browser.once('error', error => report(error.message));
    browser.once('exit', code => report('Chrome exited ' + code));
    timer = setTimeout(() => report('Timed out waiting for the mounted City render'), 80000);
    const message = await result;
    expect(message, message).toMatch(/"outside":0\b/);
  } finally {
    clearTimeout(timer);
    if (browser?.pid && browser.exitCode === null && browser.signalCode === null) {
      const stopped = new Promise(resolve => browser!.once('exit', resolve));
      browser.kill();
      await stopped;
    }
    await server.close();
    await rm(dir, {recursive: true, force: true, maxRetries: 3});
  }
}, 90000);
