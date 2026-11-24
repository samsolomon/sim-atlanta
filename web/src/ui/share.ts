/**
 * Share links (A2c step 5). Live links carry no time, so they open at the viewer's present;
 * frozen links carry t=…&speed=0. City links carry the camera as `cam` (core/camera.ts), Map
 * links carry MapLibre's own #zoom/lat/lon/bearing hash.
 */
import cameras from './share-cameras.json';
import { neighborhoodAt } from '../core/places';

export type ShareView = (
  | { view: 'city'; cam: string }
  | { view: 'map'; hash: string }
  | { view: 'models'; model: string }
) & { selection?: { kind: string; id: string } };

/** Query keys a shared link keeps from the current page; everything else (dev tools, follow) drops. */
const KEEP = ['board', 'site'];

export function sharePlace(target: ShareView, center: [number, number] | null) {
  const staged = target.view === 'city' && cameras.views.find(v => v.cam === target.cam);
  if (staged) return { path: '/s/view-' + staged.id + '/', title: staged.name + ' · Sim Atlanta' };
  const name = center && target.view !== 'models' && neighborhoodAt(...center);
  return name ? { path: '/s/' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '/', title: name + ' · Sim Atlanta' }
    : { path: '/', title: 'Sim Atlanta' };
}

export function shareUrl(page: string, target: ShareView, mode: 'live' | 'freeze', at: Date, path = '/'): string {
  const from = new URL(page);
  const u = new URL(from.origin + path);
  for (const k of KEEP) {
    const v = from.searchParams.get(k);
    if (v != null) u.searchParams.set(k, v);
  }
  if (target.selection) u.searchParams.set(target.selection.kind, target.selection.id);
  u.searchParams.set('view', target.view);
  if (target.view === 'city') u.searchParams.set('cam', target.cam);
  // A model link names the model; there is no clock to freeze in Models.
  if (target.view === 'models') u.searchParams.set('model', target.model);
  else if (mode === 'freeze') {
    u.searchParams.set('t', at.toISOString().replace(/\.\d{3}Z$/, 'Z'));
    u.searchParams.set('speed', '0');
  }
  return u.toString().replace(/%2C/g, ',').replace(/%3A/g, ':') + (target.view === 'map' ? target.hash : '');
}
