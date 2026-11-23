/**
 * Share links (A2c step 5). Live links carry no time, so they open at the viewer's present;
 * frozen links carry t=…&speed=0. City links carry the camera as `cam` (core/camera.ts), Map
 * links carry MapLibre's own #zoom/lat/lon/bearing hash.
 */
export type ShareView = { view: 'city'; cam: string } | { view: 'map'; hash: string } | { view: 'models'; model: string };

/** Query keys a shared link keeps from the current page; everything else (dev tools, follow) drops. */
const KEEP = ['board', 'site'];

export function shareUrl(page: string, target: ShareView, mode: 'live' | 'freeze', at: Date): string {
  const from = new URL(page);
  const u = new URL(from.origin + from.pathname);
  for (const k of KEEP) {
    const v = from.searchParams.get(k);
    if (v != null) u.searchParams.set(k, v);
  }
  u.searchParams.set('view', target.view);
  if (target.view === 'city') u.searchParams.set('cam', target.cam);
  // A model link names the model; there is no clock to freeze in Models.
  if (target.view === 'models') u.searchParams.set('v', target.model);
  else if (mode === 'freeze') {
    u.searchParams.set('t', at.toISOString().replace(/\.\d{3}Z$/, 'Z'));
    u.searchParams.set('speed', '0');
  }
  return u.toString().replace(/%2C/g, ',').replace(/%3A/g, ':') + (target.view === 'map' ? target.hash : '');
}
