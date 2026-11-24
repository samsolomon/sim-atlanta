// Run against a dev server with timetable and City data: node scripts/check-follow-link.mjs http://localhost:5173
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { launchChrome } from './chrome-cdp.mjs';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await launchChrome('follow-link-', ['--headless=new', '--enable-unsafe-swiftshader']);
const socket = new WebSocket(browser.wsUrl);
try {
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const { id, result, error } = JSON.parse(data);
    const request = pending.get(id);
    if (!request) return;
    pending.delete(id);
    if (error) request.reject(new Error(error.message));
    else request.resolve(result);
  };
  const call = (method, params) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const { result, exceptionDetails } = await call('Runtime.evaluate', { expression, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  const until = async expression => {
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await sleep(100);
    }
    throw new Error('Timed out waiting for ' + expression);
  };
  // Pin the real-time clock to service hours. A shifted application clock would hide live buses.
  // First bus poll returns a selectable vehicle. Hold the second poll until City has opened.
  await call('Page.enable', {});
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const start = Date.parse('2026-11-20T13:49:00-05:00');
    const elapsed = performance.now();
    const NativeDate = Date;
    window.Date = class extends NativeDate {
      static now() { return start + performance.now() - elapsed; }
      constructor(...args) { super(...(args.length ? args : [window.Date.now()])); }
    };
    const nativeFetch = window.fetch.bind(window);
    let polls = 0;
    const released = new Promise(resolve => { window.releaseLinkedBus = resolve; });
    window.fetch = async (input, options) => {
      if (!String(input).endsWith('/api/marta/bus')) return nativeFetch(input, options);
      const late = ++polls > 1;
      if (late) await released;
      const at = Date.now();
      const ids = late ? ['chosen', 'delayed'] : ['chosen'];
      return Response.json({ source: 'marta-bus-rt', fetched: at,
        buses: ids.map(id => ({ id: 'marta:bus:' + id, lon: -84.3916, lat: 33.7539, at })) });
    };
  })()` });

  for (const kind of ['route', 'bus']) {
    for (const explicit of [true, false]) {
      const linked = kind === 'route' ? 'marta:route:RED' : 'marta:bus:delayed';
      const url = new URL(base);
      url.search = new URLSearchParams({ view: 'map', q: 'low', dev: '', follow: linked });
      if (kind === 'route') url.searchParams.set('t', '2026-11-20T13:49:00-05:00');
      await call('Page.navigate', { url: url.href });
      await until("!!window.__shell && window.__trains().some(t => t.routeId === 'marta:route:STREETCAR')");
      let chosen;
      if (explicit) {
        if (kind === 'route') {
          chosen = await evaluate("window.__trains().find(t => t.routeId === 'marta:route:STREETCAR').id");
          await evaluate('window.__selectTrain(' + JSON.stringify(chosen) + ')');
        } else {
          chosen = 'marta:bus:chosen';
          await until("window.__buses().some(b => b.id === 'marta:bus:chosen')");
          await evaluate("window.__selectBus('marta:bus:chosen')");
        }
        await until("document.querySelector('[data-follow]').textContent === 'Follow in 3D'");
        await evaluate("document.querySelector('[data-follow]').click()");
      } else {
        await evaluate("window.__shell.setView('city')");
      }
      await until('!!window.__diorama');
      if (kind === 'bus') {
        if (explicit) await until("window.__follow.vehicle?.id === 'marta:bus:chosen'");
        await evaluate('window.releaseLinkedBus()');
        await until("window.__buses().some(b => b.id === 'marta:bus:delayed')");
      }
      await until('window.__follow.active');
      // The resolver runs every 500 ms. An immediate assertion misses a stale link.
      await sleep(2200);
      const actual = await evaluate(`(() => {
        const id = window.__follow.vehicle?.id;
        return { id, route: window.__trains().find(t => t.id === id)?.routeId };
      })()`);
      const label = kind + (explicit ? ' with explicit carry' : ' restored from link');
      assert.equal(explicit || kind === 'bus' ? actual.id : actual.route, chosen ?? linked, label);
      console.log('Passed', label);
    }
  }
} finally {
  socket.close();
  await browser.close();
}
