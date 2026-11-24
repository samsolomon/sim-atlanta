/**
 * Start a private headless Chrome and return the DevTools WebSocket URL of ITS page.
 *
 * Chrome picks a free port itself (--remote-debugging-port=0) and writes it to DevToolsActivePort in
 * the profile, so the URL can only belong to this browser. A random fixed port could collide with
 * another agent's Chrome on the shared Studio: ours would fail to bind and the script would then
 * drive the other browser's page and report its numbers.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = ms => new Promise(r => setTimeout(r, ms));
export const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/**
 * @param {string} prefix profile directory prefix, unique per tool (e.g. 'perf-chrome-')
 * @param {string[]} flags extra Chrome flags
 * @returns {Promise<{ wsUrl: string, port: number, profile: string, close(): Promise<void> }>}
 */
export async function launchChrome(prefix, flags = []) {
  const profile = mkdtempSync(join(tmpdir(), prefix));
  const chrome = spawn(CHROME, ['--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', ...flags, 'about:blank'], { stdio: 'ignore' });
  const close = async () => {
    const exited = new Promise(r => chrome.once('exit', r));
    chrome.kill();
    // Delete the profile only once Chrome has exited, or it writes the folder back.
    await Promise.race([exited, sleep(5000)]);
    rmSync(profile, { recursive: true, force: true });
  };
  try {
    const portFile = join(profile, 'DevToolsActivePort');
    let port = 0;
    for (let i = 0; i < 100 && !port; i++) {
      if (existsSync(portFile)) port = Number(readFileSync(portFile, 'utf8').split('\n')[0]) || 0;
      if (!port) await sleep(100);
    }
    if (!port) throw new Error('Chrome did not report its DevTools port');
    let wsUrl;
    for (let i = 0; i < 50 && !wsUrl; i++) {
      try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* starting */ }
      if (!wsUrl) await sleep(200);
    }
    if (!wsUrl) throw new Error('Chrome started without a page target');
    return { wsUrl, port, profile, close };
  } catch (e) {
    await close();
    throw e;
  }
}

/** The DevTools port a Chrome started with --remote-debugging-port=0 chose, read from its profile. */
export async function activePort(profile) {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100; i++) {
    const port = existsSync(portFile) ? Number(readFileSync(portFile, 'utf8').split('\n')[0]) : 0;
    if (port) return port;
    await sleep(100);
  }
  throw new Error('Chrome did not report its DevTools port');
}
