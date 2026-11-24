/**
 * Start City's downloads early when a visit lands on City (phone load time). Without this, City's
 * code and data wait behind the timetable fetch and the shell: on the A16 that chain was ~12 s of a
 * ~23 s load. Each prefetched response is handed out once (`takePrefetched`); anything not taken,
 * or a failed prefetch, falls back to an ordinary fetch, so this can only make a load earlier.
 */
const cache = new Map<string, { response: Promise<Response | null>; controller: AbortController }>();

export function prefetch(url: string) {
  if (cache.has(url)) return;
  const controller = new AbortController();
  cache.set(url, {
    controller,
    response: fetch(url, { signal: controller.signal }).then(r => (r.ok ? r : null), () => null),
  });
}

/** The prefetched response for `url`, once; null when there was none or it failed. */
export async function takePrefetched(url: string, signal?: AbortSignal): Promise<Response | null> {
  const p = cache.get(url);
  if (!p) return null;
  cache.delete(url);
  // Transfer cancellation to the consumer, including while it reads the response body.
  const abort = () => p.controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const response = await p.response;
  signal?.throwIfAborted();
  return response;
}

/** The downtown files createCity reads before it can build (city.ts `asset`). */
export const CITY_START_ASSETS = ['vignette.json', 'scene.json', 'trees.json', 'traffic.json', 'arterials.json', 'ground.json', 'ground.i16'];

export function prefetchCity(dataRoot: string) {
  for (const name of CITY_START_ASSETS) prefetch(`${dataRoot}/scene/downtown/${name}`);
}
