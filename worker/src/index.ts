/**
 * Railwatch edge worker.
 *   GET /api/marta/rail  → normalized live MARTA rail positions (cached ~10 s at the edge)
 *   everything else      → static site (web/dist) via the ASSETS binding
 *
 * The MARTA key is a Worker secret (MARTA_API_KEY). It only ever appears in the
 * upstream request made here, never in a response or log.
 */
import { MARTA_RAIL_URL, normalize, type MartaRow } from './marta';

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

async function martaRail(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (!env.MARTA_API_KEY) return json({ error: 'live MARTA data not configured' }, 503, 60);
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/marta/rail', req.url).toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const upstream = new URL(MARTA_RAIL_URL);
  upstream.searchParams.set('apiKey', env.MARTA_API_KEY);
  let rows: MartaRow[];
  try {
    const r = await fetch(upstream, { headers: { accept: 'application/json' } });
    if (!r.ok) return json({ error: `MARTA responded ${r.status}` }, 502, 15);
    rows = await r.json();
    if (!Array.isArray(rows)) return json({ error: 'unexpected MARTA response' }, 502, 15);
  } catch {
    return json({ error: 'MARTA unreachable' }, 502, 15);
  }
  const res = json(normalize(rows, Date.now()));
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/marta/rail') return martaRail(req, env, ctx);
    if (url.pathname.startsWith('/api/')) return json({ error: 'not found' }, 404, 60);
    return env.ASSETS ? env.ASSETS.fetch(req) : new Response('not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
