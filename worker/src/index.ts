/**
 * sim-atlanta edge worker.
 *   GET /api/marta/rail  → normalized live MARTA rail positions (cached ~10 s at the edge)
 *   GET /api/weather     → current Atlanta conditions from Open-Meteo (cached 10 min at the edge)
 *   everything else      → static site (web/dist) via the ASSETS binding
 *
 * The MARTA key is a Worker secret (MARTA_API_KEY). It only ever appears in the
 * upstream request made here, never in a cache key, response or log.
 *
 * Live responses are never cacheable by browsers. The edge keeps one copy in caches.default
 * under a short internal max-age, and every response is a rewritten copy with
 * `Cache-Control: no-store` and the current `Date`. Cloudflare otherwise serves an edge hit
 * with the zone's Browser Cache TTL (4 h), and a tab would keep a 4-hour-old snapshot as
 * though it were live.
 */
import { MARTA_RAIL_URL, normalize, type MartaRow } from './marta';

import { BUS_URL, normalizeBuses } from './bus';
import type { BusRoutes } from '../../web/src/model/types';

export interface Env {
  MARTA_API_KEY: string;
  ASSETS?: Fetcher;
}

const CACHE_SECONDS = 10;

const json = (body: unknown, status = 200, maxAge = CACHE_SECONDS) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${maxAge}`,
      'access-control-allow-origin': '*',
    },
  });

// Give every client a current server clock, including when the snapshot came from the edge
// cache, and forbid browser caching. The tab controls its own polling cadence.
export function serveSnapshot(snapshot: Response) {
  const response = new Response(snapshot.body, snapshot);
  response.headers.set('Date', new Date().toUTCString());
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

async function martaRail(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (!env.MARTA_API_KEY) return serveSnapshot(json({ error: 'live MARTA data not configured' }, 503, 60));
  const cache = caches.default;
  // The key is our own path only; the upstream URL carrying the API key is never cached.
  const cacheKey = new Request(new URL('/api/marta/rail', req.url).toString());
  const hit = await cache.match(cacheKey);
  if (hit) return serveSnapshot(hit);

  const upstream = new URL(MARTA_RAIL_URL);
  upstream.searchParams.set('apiKey', env.MARTA_API_KEY);
  let rows: MartaRow[];
  try {
    const r = await fetch(upstream, { headers: { accept: 'application/json' } });
    if (!r.ok) return serveSnapshot(json({ error: `MARTA responded ${r.status}` }, 502, 15));
    rows = await r.json();
    if (!Array.isArray(rows)) return serveSnapshot(json({ error: 'unexpected MARTA response' }, 502, 15));
  } catch {
    return serveSnapshot(json({ error: 'MARTA unreachable' }, 502, 15));
  }
  const res = json(normalize(rows, Date.now()));
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return serveSnapshot(res);
}

async function martaBus(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (req.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET' } });
  const key = new Request(new URL('/api/marta/bus', req.url));
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit) return serveSnapshot(hit);
  let response: Response;
  try {
    const [upstream, routes] = await Promise.all([
      fetch(BUS_URL, { headers: { 'User-Agent': 'sim-atlanta/1.0', Accept: '*/*' } }),
      env.ASSETS?.fetch(new Request(new URL('/data/ga/bus-routes.json', req.url)))
        .then(r => r.ok ? r.json<BusRoutes>() : {}).catch(() => ({})),
    ]);
    if (!upstream.ok) throw new Error('feed unavailable');
    response = json(normalizeBuses(await upstream.arrayBuffer(), routes ?? {}, Date.now()), 200, 30);
  } catch {
    response = json({ error: 'MARTA bus feed unavailable' }, 503, 30);
  }
  ctx.waitUntil(cache.put(key, response.clone()));
  return serveSnapshot(response);
}

// Open-Meteo's current conditions for downtown Atlanta. One upstream call per edge location
// every 10 minutes, however many visitors; phones that can't reach Open-Meteo directly in time
// still get the weather.
const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=33.755&longitude=-84.38&current=weather_code,cloud_cover,precipitation,visibility,temperature_2m&temperature_unit=fahrenheit&timezone=America%2FNew_York&timeformat=unixtime';

async function weather(req: Request, ctx: ExecutionContext): Promise<Response> {
  const key = new Request(new URL('/api/weather', req.url));
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit) return serveSnapshot(hit);
  let response: Response;
  try {
    const r = await fetch(WEATHER_URL, { headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`open-meteo ${r.status}`);
    const body = await r.json<{ current?: unknown }>();
    if (!body.current) throw new Error('no current conditions');
    response = json({ current: body.current }, 200, 600);
  } catch {
    response = json({ error: 'weather unavailable' }, 503, 120);
  }
  ctx.waitUntil(cache.put(key, response.clone()));
  return serveSnapshot(response);
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/marta/bus') return martaBus(req, env, ctx);
    if (url.pathname === '/api/marta/rail') return martaRail(req, env, ctx);
    if (url.pathname === '/api/weather') return weather(req, ctx);
    if (url.pathname.startsWith('/api/')) return serveSnapshot(json({ error: 'not found' }, 404, 60));
    return env.ASSETS ? env.ASSETS.fetch(req) : new Response('not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
