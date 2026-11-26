// City's camera wiring, in a real browser with trusted input: every way of moving the view tells
// sliced builds to step back, a still camera is left idle, and leaving City mid-drag lets go.
import { existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';
import { expect, it } from 'vitest';

// SKIP_BROWSER_TESTS=1: a machine whose Chrome has no GPU (CI) is too slow to draw City.
const chrome = process.env.SKIP_BROWSER_TESTS === '1' ? undefined : [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(path => path && existsSync(path));
const staged = existsSync('public/data/scene/square-board/r16/context.json') && existsSync('public/data/ga/timetable.json');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

type Launch = (prefix: string, flags: string[]) => Promise<{ wsUrl: string; close(): Promise<void> }>;

it.skipIf(!chrome || !staged)('tells sliced builds about every camera input, and lets go when City leaves mid-drag', async () => {
  process.env.CHROME = chrome;
  const helper = new URL('../../scripts/chrome-cdp.mjs', import.meta.url).href;
  const { launchChrome } = await import(/* @vite-ignore */ helper) as { launchChrome: Launch };
  const dir = mkdtempSync(join(tmpdir(), 'camera-input-'));
  const server = await createServer({ configFile: false, cacheDir: join(dir, 'vite'), logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false } });
  let browser: Awaited<ReturnType<Launch>> | undefined;
  let ws: WebSocket | undefined;
  try {
    await server.listen();
    browser = await launchChrome('camera-input-', ['--headless=new', '--disable-background-timer-throttling', '--window-size=1100,800']);
    const socket = ws = new WebSocket(browser.wsUrl);
    await new Promise(resolve => { socket.onopen = resolve; });
    let id = 0;
    const waiting = new Map<number, (m: { result?: { result?: { value?: unknown } } }) => void>();
    socket.onmessage = e => { const m = JSON.parse(String(e.data)); waiting.get(m.id)?.(m); };
    const send = (method: string, params: object = {}) => new Promise<{ result?: { result?: { value?: unknown } } }>(resolve => {
      waiting.set(++id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });
    const read = async <T>(expression: string) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value as T;
    const until = async (what: string, expression: string, ms: number) => {
      for (const end = Date.now() + ms; Date.now() < end; await sleep(100)) if (await read<boolean>(expression)) return;
      throw Error('Timed out waiting for ' + what);
    };
    const age = 'performance.now() - window.__sliceInput.inputAt';
    await send('Page.enable');
    await send('Page.navigate', { url: server.resolvedUrls!.local[0] + '?view=city&q=low&t=2026-11-20T14:00:00-05:00&speed=0' });
    await until('City', '!!(window.__diorama && window.__sliceInput && window.__cityDev?.areas().size >= 5)', 90_000);

    const x = 550, y = 380;
    const mouse = (type: string, extra: object = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', ...extra });
    const key = (type: string) => send('Input.dispatchKeyEvent', { type, key: 'q', code: 'KeyQ', windowsVirtualKeyCode: 81, ...(type === 'keyDown' ? { text: 'q' } : {}) });
    const inputs: Record<string, () => Promise<unknown>> = {
      drag: async () => { await mouse('mousePressed', { clickCount: 1 }); await mouse('mouseMoved', { x: x + 90, buttons: 1 }); await mouse('mouseReleased', { x: x + 90, clickCount: 1 }); },
      'trackpad orbit': () => mouse('mouseWheel', { deltaX: 60, deltaY: 0 }),
      pinch: () => mouse('mouseWheel', { deltaX: 0, deltaY: -40, modifiers: 2 }),
      'the Q key': async () => { await key('keyDown'); await sleep(250); await key('keyUp'); },
      'the tilt slider': () => read(`(() => { const t = document.querySelector('input.a2-tilt'); t.value = String(Number(t.value) > 35 ? 20 : 55); t.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`),
    };
    const missed: string[] = [];
    for (const [name, act] of Object.entries(inputs)) {
      // A still camera is idle, even while areas load.
      await until(`an idle camera before ${name}`, `${age} > 1300`, 30_000);
      await act();
      await sleep(300);
      if (!await read<boolean>(`${age} < 700`)) missed.push(name);
    }
    expect(missed).toEqual([]);

    await mouse('mousePressed', { clickCount: 1 });
    await mouse('mouseMoved', { x: x + 40, buttons: 1 });
    await until('the held drag', 'window.__sliceInput.dragging === true', 5000);
    await read(`(window.__shell.setView('map'), true)`);
    await until('City to go', '!window.__diorama', 20_000);
    expect(await read<boolean>('window.__sliceInput.dragging')).toBe(false);
  } finally {
    ws?.close();
    await browser?.close();
    await server.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  }
}, 180_000);
