/**
 * Start City's downloads early when a visit lands on City (phone load time). Without this, City's
 * code and data wait behind the timetable fetch and the shell: on the A16 that chain was ~12 s of a
 * ~23 s load. Each prefetched response is handed out once (`takePrefetched`); anything not taken,
 * or a failed prefetch, falls back to an ordinary fetch, so this can only make a load earlier.
 */
const cache = new Map<string, Promise<Response | null>>();

export function prefetch(url: string) {
  if (cache.has(url)) return;
  cache.set(url, fetch(url).then(r => (r.ok ? r : null), () => null));
}

/** The prefetched response for `url`, once; null when there was none or it failed. */
export async function takePrefetched(url: string): Promise<Response | null> {
  const p = cache.get(url);
  if (!p) return null;
  cache.delete(url);
  return p;
}

/** The downtown files createCity reads before it can build (city.ts `asset`). */
export const CITY_START_ASSETS = ['vignette.json', 'scene.json', 'trees.json', 'traffic.json', 'arterials.json', 'ground.json', 'ground.i16'];

export function prefetchCity(dataRoot: string) {
  for (const name of CITY_START_ASSETS) prefetch(`${dataRoot}/scene/downtown/${name}`);
}
