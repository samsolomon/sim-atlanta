import type { Builder } from './geom';

/**
 * Single-unit 53-foot double-stack well car with domestic containers. Envelope from Greenbrier's
 * 53' Husky-Stack (HS53): 76 ft 8.75 in (23.38 m) over couplers, 53 ft inside the well. Truck
 * centres, girder depth and well-floor height are estimated from photographs; see
 * docs/freight-consists.md. Containers are 53-foot domestic high cubes (16.15 × 2.59 × 2.90 m).
 * Plain colours only: no lettering, logos or reporting marks.
 */
export const WELL_LENGTH = 23.387; // 76 ft 8.75 in
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

/**
 * City's container palette, generic look-alikes with no marks. Indices 0–4 are 53 ft domestic boxes
 * (mostly white), 5–9 are 40 ft international boxes. Inputs are lighter than the paint, because
 * City's colour grade darkens deep colours. The consist planner picks per container, and the freight
 * shader (city/freight-batches.ts) reads these by index.
 */
export const CONTAINER_PALETTE = [
  '#dcdad2', // white
  '#c9a043', // mustard
  '#d58440', // orange
  '#b04c41', // red
  '#a9aeb1', // silver-grey
  '#9a4a4f', // maroon
  '#4774a6', // blue
  '#55876a', // green
  '#8f969b', // grey
  '#459494', // teal
] as const;
/** Weight of each domestic colour (indices 0–4) and each international colour (indices 5–9). */
export const DOMESTIC_WEIGHTS = [0.42, 0.14, 0.12, 0.14, 0.18] as const;
export const INTERNATIONAL_WEIGHTS = [0.2, 0.2, 0.2, 0.2, 0.2] as const;
export const BOX_53 = BOX_L;
export const BOX_40 = 12.19;
/** A container's length factor in the well geometry (its boxes are modelled 53 ft long). */
export const BOX_40_SCALE = BOX_40 / BOX_53;

/** Per-vertex container tags for City's freight shader: which slot a vertex belongs to (1 bottom,
 * 2 top) and its shade relative to the container's paint (ribs and posts are darker). */
export interface ContainerTag { start: number; end: number; slot: 1 | 2; shade: number }

const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
};

function container(b: Builder, y0: number, color: string, low: boolean, slot: 1 | 2, tags: ContainerTag[]) {
  const yc = y0 + BOX_H / 2;
  const tagged = (shadeF: number, add: () => void) => {
    const start = b.pos.length / 3;
    add();
    tags.push({ start, end: b.pos.length / 3, slot, shade: shadeF });
  };
  tagged(1, () => b.box(BOX_W, BOX_H, BOX_L, 0, yc, 0, color));
  if (low) return;
  const rib = shade(color, 0.86), post = shade(color, 0.7);
  // Corrugated sides, painted as raised ribs every 1.15 m; darker corner posts and rails.
  tagged(0.86, () => {
    for (const s of [-1, 1]) for (let z = -BOX_L / 2 + 0.6; z < BOX_L / 2 - 0.4; z += 1.15) b.box(0.03, BOX_H - 0.3, 0.32, s * (BOX_W / 2 + 0.01), yc, z, rib);
  });
  tagged(0.7, () => {
    for (const s of [-1, 1]) {
      b.box(0.05, 0.12, BOX_L, s * (BOX_W / 2 + 0.015), y0 + 0.06, 0, post);
      b.box(0.05, 0.1, BOX_L, s * (BOX_W / 2 + 0.015), y0 + BOX_H - 0.05, 0, post);
    }
    for (const e of [-1, 1]) for (const x of [-1, 1]) b.box(0.14, BOX_H, 0.14, x * (BOX_W / 2 - 0.06), yc, e * (BOX_L / 2 - 0.06), post);
    // Door end (rear, −z): four locking bars.
    for (const x of [-0.95, -0.35, 0.35, 0.95]) b.box(0.05, BOX_H - 0.25, 0.04, x, yc, -BOX_L / 2 - 0.02, post);
  });
}

/**
 * Well, girders, end platforms and the baked container load, above the shared trucks. Returns the
 * container vertex tags; the bottom and top boxes are always modelled 53 ft, centred on the car, so
 * City's shader can shorten either to 40 ft or hide it.
 */
export function wellCarBody(b: Builder, load: WellLoad, low: boolean, override?: [string | null, string | null]): ContainerTag[] {
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
  const [bottom, top] = override ?? WELL_LOADS[load];
  const tags: ContainerTag[] = [];
  if (bottom) container(b, FLOOR, bottom, low, 1, tags);
  if (top) container(b, FLOOR + BOX_H, top, low, 2, tags);
  return tags;
}
