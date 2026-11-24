import type { Builder } from './geom';

/**
 * Single-unit 53-foot double-stack well car with domestic containers. Envelope from Greenbrier's
 * 53' Husky-Stack (HS53): 76 ft 8.75 in (23.38 m) over couplers, 53 ft inside the well. Truck
 * centres, girder depth and well-floor height are estimated from photographs; see
 * docs/freight-consists.md. Containers are 53-foot domestic high cubes (16.15 × 2.59 × 2.90 m).
 * Plain colours only: no lettering, logos or reporting marks.
 */
export const WELL_LENGTH = 23.38;
export const WELL_TRUCKS = 19.2;
const WELL_HALF = 8.15; // half the inside well length
const FLOOR = 0.36; // container floor above the rail
const BOX_L = 16.15, BOX_W = 2.59, BOX_H = 2.9;

export type WellLoad = 'wellA' | 'wellB' | 'wellC';
/** Bottom and top container colours per baked load; null is an empty top slot. */
export const WELL_LOADS: Record<WellLoad, [string, string | null]> = {
  wellA: ['#d6d4cc', '#8b3a2e'], // white over red-brown
  wellB: ['#2f5b8c', '#7e848a'], // blue over grey
  wellC: ['#a8893f', null], // a faded mustard box, single stack
};

const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
};

function container(b: Builder, y0: number, color: string, low: boolean) {
  const yc = y0 + BOX_H / 2;
  b.box(BOX_W, BOX_H, BOX_L, 0, yc, 0, color);
  if (low) return;
  const rib = shade(color, 0.86), post = shade(color, 0.7);
  // Corrugated sides, painted as raised ribs every 1.15 m; darker corner posts and rails.
  for (const s of [-1, 1]) {
    for (let z = -BOX_L / 2 + 0.6; z < BOX_L / 2 - 0.4; z += 1.15) b.box(0.03, BOX_H - 0.3, 0.32, s * (BOX_W / 2 + 0.01), yc, z, rib);
    b.box(0.05, 0.12, BOX_L, s * (BOX_W / 2 + 0.015), y0 + 0.06, 0, post);
    b.box(0.05, 0.1, BOX_L, s * (BOX_W / 2 + 0.015), y0 + BOX_H - 0.05, 0, post);
  }
  for (const e of [-1, 1]) for (const x of [-1, 1]) b.box(0.14, BOX_H, 0.14, x * (BOX_W / 2 - 0.06), yc, e * (BOX_L / 2 - 0.06), post);
  // Door end (rear, −z): four locking bars.
  for (const x of [-0.95, -0.35, 0.35, 0.95]) b.box(0.05, BOX_H - 0.25, 0.04, x, yc, -BOX_L / 2 - 0.02, post);
}

/** Well, girders, end platforms and the baked container load, above the shared trucks. */
export function wellCarBody(b: Builder, load: WellLoad, low: boolean) {
  const frame = '#3b3f42', girder = '#4a4e51', deck = '#55595c';
  const half = WELL_LENGTH / 2;
  // End platforms over the trucks, with a bulkhead at each end of the well.
  for (const e of [-1, 1]) {
    const z0 = WELL_HALF, z1 = half - 0.35, zc = e * (z0 + z1) / 2;
    b.box(2.9, 0.42, z1 - z0, 0, 1.12, zc, frame);
    b.box(2.6, 0.06, z1 - z0 - 0.3, 0, 1.36, zc, deck);
    b.box(2.9, 1.2, 0.25, 0, 0.95, e * (WELL_HALF + 0.12), girder);
  }
  // Deep side girders along the well, open above so the upper container shows.
  for (const s of [-1, 1]) {
    b.box(0.14, 1.12, 2 * WELL_HALF, s * 1.42, 0.92, 0, girder);
    b.box(0.3, 0.08, 2 * WELL_HALF, s * 1.38, 1.52, 0, frame); // top chord
    if (!low) for (let z = -WELL_HALF + 1.1; z < WELL_HALF - 0.6; z += 2.2) b.box(0.05, 1.0, 0.1, s * 1.5, 0.95, z, frame); // stiffeners
  }
  b.box(2.7, 0.1, 2 * WELL_HALF, 0, FLOOR - 0.05, 0, frame); // well floor
  const [bottom, top] = WELL_LOADS[load];
  container(b, FLOOR, bottom, low);
  if (top) container(b, FLOOR + BOX_H, top, low);
}
