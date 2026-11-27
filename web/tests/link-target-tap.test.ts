// A camera link to Brookwood, in a real browser: the link's destination must survive what can
// happen while the station row is still loading and the camera waits at the downtown edge.
// - A tap on the canvas. Its pointerdown used to cancel the target (release 19).
// - Auto's step-down to Low. The rebuild used to reopen at the clamped downtown point.
import { existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';
import { expect, it } from 'vitest';

// SKIP_BROWSER_TESTS=1: a machine whose Chrome has no GPU (CI) is too slow to draw City.
const chrome = process.env.SKIP_BROWSER_TESTS === '1' ? undefined : [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(path => path && existsSync(path));
const staged = existsSync('public/data/scene/square-board/brookwood-station/context.json') && existsSync('public/data/ga/timetable.json');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const target = { x: -92, z: -5054 };
const link = `t=2026-11-20T11:30:00-05:00&speed=0&cam=${target.x},${target.z},40,58,420`;

type Launch = (prefix: string, flags: string[]) => Promise<{ wsUrl: string; close(): Promise<void> }>;
interface Page {
  send(method: string, params?: object): Promise<unknown>;
  read<T>(expression: string): Promise<T>;
  until(what: string, test: () => Promise<boolean> | boolean, ms: number): Promise<void>;
  held(): number;
}

/** Opens `query` with the station row held back, runs `whileHeld`, releases the row, and returns how
 * far the camera was from the link target while held and after the row mounted (metres). */
async function linkThrough(query: string, whileHeld: (page: Page) => Promise<void>) {
  process.env.CHROME = chrome;
  const helper = new URL('../../scripts/chrome-cdp.mjs', import.meta.url).href;
  const { launchChrome } = await import(/* @vite-ignore */ helper) as { launchChrome: Launch };
  const dir = mkdtempSync(join(tmpdir(), 'link-target-'));
  const waiting: (() => void)[] = [];
  let released = false;
  const server = await createServer({
    configFile: false, cacheDir: join(dir, 'vite'), logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [{
      name: 'link-target-test',
      configureServer(dev) {
        dev.middlewares.use((req, _res: ServerResponse, next) => {
          if (released || !req.url?.includes('/square-board/brookwood-station/context.json')) return next();
          waiting.push(() => next());
        });
      },
    }],
  });
  let browser: Awaited<ReturnType<Launch>> | undefined;
  let ws: WebSocket | undefined;
  try {
    await server.listen();
    browser = await launchChrome('link-target-', ['--headless=new', '--disable-background-timer-throttling', '--window-size=1100,800']);
    const socket = ws = new WebSocket(browser.wsUrl);
    await new Promise(resolve => { socket.onopen = resolve; });
    let id = 0;
    const replies = new Map<number, (m: { result?: { result?: { value?: unknown } } }) => void>();
    socket.onmessage = e => { const m = JSON.parse(String(e.data)); replies.get(m.id)?.(m); };
    const send = (method: string, params: object = {}) => new Promise<{ result?: { result?: { value?: unknown } } }>(resolve => {
      replies.set(++id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });
    const read = async <T>(expression: string) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value as T;
    const until = async (what: string, test: () => Promise<boolean> | boolean, ms: number) => {
      for (const end = Date.now() + ms; Date.now() < end; await sleep(100)) if (await test()) return;
      throw Error('Timed out waiting for ' + what);
    };
    const away = () => read<number>(`(() => { const t = window.__city?.target(); return t ? Math.hypot(t.x - ${target.x}, t.z - ${target.z}) : Infinity; })()`);

    await send('Page.enable');
    await send('Page.navigate', { url: server.resolvedUrls!.local[0] + '?view=city&' + query });
    await until('City to open on the link', () => read<boolean>(`!!window.__city && document.getElementById('city-loading')?.hidden === true`), 90_000);
    await until('the station row request', () => waiting.length > 0, 60_000);
    await whileHeld({ send, read, until, held: () => waiting.length });
    // Held at the nearest loaded edge, kilometres short of Brookwood.
    const parked = await away();
    released = true;
    waiting.splice(0).forEach(go => go());
    let arrived = Infinity;
    await until('the link target', async () => (arrived = await away()) < 50, 60_000).catch(() => undefined);
    return { parked, arrived };
  } finally {
    ws?.close();
    await browser?.close();
    await server.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  }
}

it.skipIf(!chrome || !staged)('keeps a Brookwood camera link through a tap made while its row loads', async () => {
  const { parked, arrived } = await linkThrough(`q=low&${link}`, async ({ send }) => {
    // A tap: press and release on one pixel, as inspecting a vehicle or focusing the page does.
    const at = { x: 550, y: 420, button: 'left', clickCount: 1 };
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at });
    await sleep(300);
  });
  expect({ parkedFar: parked > 1000, arrivedWithin50m: arrived < 50 }, `still ${Math.round(arrived)} m from the link target`)
    .toEqual({ parkedFar: true, arrivedWithin50m: true });
}, 180_000);

it.skipIf(!chrome || !staged)('keeps a Brookwood camera link through Auto stepping down to Low while its row loads', async () => {
  // No ?q, so Auto watches the frame rate; dev's ?slowfps=1000 makes any rate count as slow.
  const { parked, arrived } = await linkThrough(`slowfps=1000&${link}`, async ({ read, until, held }) => {
    // The rebuild at Low asks for the station row again; keep it held until that new City is up.
    await until('the step down to Low', () => read<boolean>(`window.__city?.quality === 'low' && document.getElementById('city-loading')?.hidden === true`), 90_000);
    await until('the rebuilt City to ask for the row', () => held() > 1, 60_000);
  });
  expect({ parkedFar: parked > 1000, arrivedWithin50m: arrived < 50 }, `still ${Math.round(arrived)} m from the link target`)
    .toEqual({ parkedFar: true, arrivedWithin50m: true });
}, 240_000);
