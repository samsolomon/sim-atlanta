import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import worker, { type Env } from './index';

const KEY = 'test-secret-marta-key-123';
const store = new Map<string, Response>();
const puts: string[] = [];
const logs: string[] = [];

beforeEach(() => {
  store.clear();
  puts.length = 0;
  logs.length = 0;
  vi.stubGlobal('caches', {
    default: {
      async match(req: Request) {
        return store.get(req.url)?.clone();
      },
      async put(req: Request, res: Response) {
        puts.push(req.url);
        store.set(req.url, res.clone());
      },
    },
  });
  for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const)
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(' ')));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const env: Env = { MARTA_API_KEY: KEY };
async function call(path: string) {
  const waits: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => void waits.push(p), passThroughOnException() {} } as unknown as ExecutionContext;
  const res = await worker.fetch(new Request(`https://atlanta.example${path}`), env, ctx);
  await Promise.all(waits);
  return res;
}
async function text(res: Response) {
  const headers = [...res.headers].map(([k, v]) => `${k}: ${v}`).join('\n');
  return `${headers}\n${await res.text()}`;
}
function expectUncacheable(res: Response) {
  expect(res.headers.get('cache-control')).toBe('no-store');
  const served = Date.parse(res.headers.get('date') ?? '');
  expect(Math.abs(served - Date.now())).toBeLessThan(2_000);
}

const martaRow = {
  TRAIN_ID: '101', LINE: 'RED', DIRECTION: 'N', DESTINATION: 'North Springs', LATITUDE: '33.75', LONGITUDE: '-84.39',
  EVENT_TIME: '11/24/2026 1:00:00 AM', NEXT_ARR: '01:01:00 AM', STATION: 'FIVE POINTS STATION', WAITING_SECONDS: '60',
};

it('serves live rail as no-store with a fresh Date on a miss and on an edge hit, keyed without the API key', async () => {
  const upstream = vi.fn(async (_url: string | URL) => new Response(JSON.stringify([martaRow]), { status: 200 }));
  vi.stubGlobal('fetch', upstream);
  const miss = await call('/api/marta/rail');
  expect(miss.status).toBe(200);
  expectUncacheable(miss);
  expect(String(upstream.mock.calls[0][0])).toContain(KEY); // only the upstream request carries it
  expect(puts).toEqual(['https://atlanta.example/api/marta/rail']);
  // The edge copy keeps a short internal TTL; only the served copy is rewritten.
  expect(store.get(puts[0])!.headers.get('cache-control')).toBe('public, max-age=10');

  // An edge hit, even one stored long ago with a browser-cacheable header, is served no-store and dated now.
  const old = store.get(puts[0])!;
  const stale = new Response(old.body, old);
  stale.headers.set('date', new Date(Date.now() - 4 * 3600_000).toUTCString());
  stale.headers.set('cache-control', 'public, max-age=14400');
  store.set(puts[0], stale);
  const hit = await call('/api/marta/rail');
  expect(upstream).toHaveBeenCalledTimes(1);
  expectUncacheable(hit);
  for (const r of [miss, hit]) expect(await text(r.clone())).not.toContain(KEY);
  for (const url of puts) expect(url).not.toContain(KEY);
  expect(logs.join('\n')).not.toContain(KEY);
});

it('serves rail errors as no-store and never leaks the key or caches the failure', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
  const res = await call('/api/marta/rail');
  expect(res.status).toBe(502);
  expectUncacheable(res);
  expect(await text(res)).not.toContain(KEY);
  expect(puts).toEqual([]);
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error(`network down for ?apiKey=${KEY}`); }));
  const down = await call('/api/marta/rail');
  expect(down.status).toBe(502);
  expect(await text(down)).not.toContain(KEY);
  expect(logs.join('\n')).not.toContain(KEY);
});

it('serves weather as no-store on a miss and on an edge hit, with Unix observation times', async () => {
  const upstream = vi.fn(async (_url: string | URL) =>
    new Response(JSON.stringify({ current: { time: 1_800_000_000, weather_code: 3, cloud_cover: 90, precipitation: 0 } })));
  vi.stubGlobal('fetch', upstream);
  const miss = await call('/api/weather');
  expectUncacheable(miss);
  expect(String(upstream.mock.calls[0][0])).toContain('timeformat=unixtime');
  expect((await miss.json() as { current: { time: number } }).current.time).toBe(1_800_000_000);
  expect(store.get(puts[0])!.headers.get('cache-control')).toBe('public, max-age=600');
  const hit = await call('/api/weather');
  expect(upstream).toHaveBeenCalledTimes(1);
  expectUncacheable(hit);
});

it('keeps unknown API paths and the unconfigured rail feed out of browser caches', async () => {
  expectUncacheable(await call('/api/nope'));
  const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
  expectUncacheable(await worker.fetch(new Request('https://atlanta.example/api/marta/rail'), { MARTA_API_KEY: '' }, ctx));
});
