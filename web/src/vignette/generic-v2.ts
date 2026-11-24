/**
 * Generic buildings v2 (`?generic=v2`, default off until Sam picks): archetypes for Atlanta's
 * ordinary stock, so unskinned blocks stop reading as one pale blue-grey glass box.
 *
 * Each archetype is a wall palette, a cap and base treatment, and a facade pattern in the
 * existing generic window shader (world.ts patchFacades), selected by an integer `aStyle` id:
 *
 *   style = V2_STYLE0 + archetype * 4 + variant      (20..51)
 *   base styles 52..55: lobby glass, dark arcade, blank plinth, shopfront with sign band
 *
 * The variant picks window rhythm (floor height, bay width) and, for glass archetypes, the
 * glass family from docs/glass-palette.md. Ids stay small integers so far houses' Int8
 * compaction still applies. No new attribute, uniform or define: the shader source is the
 * same with the flag on or off, so the program count does not change.
 *
 * Assignment is deterministic from data (class, height, footprint area and shape, district)
 * with a per-building stream seeded from the id plus ':v2', separate from World's stream, so
 * the legacy draw and the rooftop clutter stay identical.
 */
import { hashStr, rng, type P2 } from './geom';

export const V2_STYLE0 = 20;
export const Arch = { Precast: 0, Banded: 1, Brick: 2, Limestone: 3, Residential: 4, Deck: 5, Shop: 6, Glass: 7 } as const;
export type Arch = (typeof Arch)[keyof typeof Arch];
export const BaseStyle = { Lobby: 52, Arcade: 53, Plinth: 54, Shopfront: 55 } as const;
export const ARCH_NAMES = ['precast', 'banded', 'brick', 'limestone', 'residential', 'deck', 'shop', 'glass'] as const;

/** `?generic=v2` turns the archetypes on (City and the vignette). Tests call setGenericV2. */
let on = (() => {
  try { return new URLSearchParams(globalThis.location?.search ?? '').get('generic') === 'v2'; } catch { return false; }
})();
export function genericV2() { return on; }
export function setGenericV2(v: boolean) { on = v; }

/** What one generic building looks like under v2. Colours are sRGB hex (vertex colours). */
export interface GenericLook {
  arch: Arch;
  /** aStyle for the shaft. */
  style: number;
  wall: string;
  /** Storeys 0..baseH (metres above grade) use the base colour and base style; 0 = none. */
  baseH: number;
  base: string;
  baseStyle: number;
  /** Inset of the base below the shaft, metres (a recessed lobby or arcade); 0 = flush. */
  inset: number;
  /** Cap band at the top of the wall, metres (coping, cornice or a mechanical screen); 0 = none. */
  capH: number;
  cap: string;
  /** Cornice projection beyond the wall, metres; 0 = flush band. */
  overhang: number;
  /** Penthouse / mechanical screen colour for the big rooftop unit. */
  penthouse: string;
  /** Roof membrane or gravel; warm neutral, never the legacy towers' blue-grey. */
  roof?: string;
}

// Palettes are taken from photographs of Atlanta's ordinary stock (docs/generic-buildings.md
// lists the sources). Glass stays inside docs/glass-palette.md: the shader's glass families are
// near-neutral at mid value, so sunlit rendered S <= 36 and V >= 40.
const PRECAST = ['#d6d0c2', '#cbc5b6', '#ddd8cb', '#c2bba9', '#d1c7b3'];
const BANDED = ['#a39b8c', '#b4ab99', '#8f8b82', '#9c9a90', '#ab9f8b'];
const BRICK = ['#9c5a43', '#a86a4f', '#8b4e3c', '#b0805f', '#93604c', '#7f4b3d'];
const LIMESTONE = ['#d5c7a8', '#cbbd9f', '#dcd0b6', '#c2b59b', '#cfc3ad'];
const RESIDENTIAL = ['#e4dfd4', '#d8d1c2', '#d0d2cd', '#cbbba4', '#ddd4c6'];
const DECK = ['#d2cdc2', '#c7c1b5', '#d9d4c9', '#bdb8ad'];
const SHOP = ['#d9cdb5', '#c9b99d', '#c0b7a7', '#b9a68c', '#a9583f', '#cfc6b4', '#9c5d48'];
const GLASS_FRAME = ['#9ea4a7', '#b0b3b2', '#8c9396', '#a8a59c'];

/** Tall buildings whose class says housing, a hotel or a dorm. */
const HOMES = new Set(['apartments', 'residential', 'hotel', 'dormitory']);
const SHOPS = new Set(['retail', 'commercial', 'supermarket', 'kiosk']);
/** Classes v2 leaves on the legacy styles (small or special structures). */
const SKIP = new Set(['roof', 'shed', 'guardhouse', 'shelter', 'pavilion', 'church', 'stadium', 'house', 'detached', 'semidetached_house', 'terrace', 'garages', 'cathedral', 'chapel']);

function pick<T>(r: () => number, xs: readonly T[]) { return xs[Math.floor(r() * xs.length) % xs.length]; }
function weighted<T>(r: () => number, xs: readonly [T, number][]) {
  const total = xs.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of xs) if ((x -= w) < 0) return v;
  return xs[xs.length - 1][0];
}

function footprint(ring: P2[]) {
  let a = 0, per = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % ring.length];
    a += x0 * z1 - x1 * z0;
    per += Math.hypot(x1 - x0, z1 - z0);
  }
  const area = Math.abs(a) / 2;
  // 1 for a circle, ~0.79 for a square, lower for long or ragged plans.
  return { area, compact: per > 0 ? (4 * Math.PI * area) / (per * per) : 0 };
}

/** Midtown starts north of North Avenue (scene z of about -1700). */
const MIDTOWN_Z = -1700;

/**
 * The archetype for one generic building, or null to keep the legacy look.
 * `h` is the drawn height in metres, `cls` the OSM/Overture class.
 */
export function archetypeFor(id: string, cls: string | null | undefined, h: number, rings: P2[][]): Arch | null {
  const c = cls && cls !== 'yes' ? cls : null;
  if (c && SKIP.has(c)) return null;
  const outer = rings[0];
  if (!outer || outer.length < 3) return null;
  const { area, compact } = footprint(outer);
  if (h < 5 || area < 60) return null;
  const r = rng(hashStr(id + ':v2'));
  let cz = 0;
  for (const p of outer) cz += p[1];
  const midtown = cz / outer.length < MIDTOWN_Z;
  // Decks top out around ten levels; a taller 'parking' polygon carries a neighbour's height.
  if ((c === 'parking' || c === 'garage') && h <= 36) return Arch.Deck;
  if (h < 12) {
    // One- to three-storey stock: shopfronts on commercial streets, brick otherwise.
    if (c && SHOPS.has(c)) return r() < 0.75 ? Arch.Shop : Arch.Brick;
    if (c && HOMES.has(c)) return r() < 0.5 ? Arch.Brick : Arch.Residential;
    return weighted(r, [[Arch.Shop, 0.45], [Arch.Brick, 0.4], [Arch.Precast, 0.15]]);
  }
  if (c && HOMES.has(c)) {
    if (h < 25) return r() < 0.55 ? Arch.Residential : Arch.Brick;
    return weighted(r, [[Arch.Residential, 0.7], [Arch.Glass, midtown ? 0.2 : 0.1], [Arch.Precast, 0.15]]);
  }
  if (c === 'university' || c === 'hospital' || c === 'public' || c === 'government' || c === 'civic' || c === 'library')
    return weighted(r, [[Arch.Precast, 0.45], [Arch.Brick, 0.3], [Arch.Limestone, 0.25]]);
  // Long, low, ragged footprints read as decks or warehouses, not offices.
  if (h < 22 && area > 3500 && compact > 0.55 && !c && r() < 0.2) return Arch.Deck;
  if (h < 30) return weighted(r, [[Arch.Brick, 0.35], [Arch.Limestone, 0.2], [Arch.Precast, 0.3], [Arch.Banded, 0.15]]);
  if (h < 60) return weighted(r, [[Arch.Precast, 0.35], [Arch.Banded, 0.3], [Arch.Limestone, 0.15], [Arch.Brick, 0.1], [Arch.Residential, midtown ? 0.25 : 0.05], [Arch.Glass, 0.05]]);
  if (h < 110) return weighted(r, [[Arch.Precast, 0.3], [Arch.Banded, 0.35], [Arch.Limestone, 0.1], [Arch.Residential, midtown ? 0.25 : 0.05], [Arch.Glass, midtown ? 0.25 : 0.12]]);
  return weighted(r, [[Arch.Banded, 0.35], [Arch.Precast, 0.2], [Arch.Glass, midtown ? 0.45 : 0.3]]);
}

/** The full look: palette, base, cap and shader style. `h` is the wall height above grade. */
export function lookFor(id: string, arch: Arch, h: number): GenericLook {
  const look = lookBody(id, arch, h);
  const r = rng(hashStr(id + ':v2roof'));
  // Green roofs stay rare; decks keep their own top deck colour.
  look.roof = arch === Arch.Deck ? shade(look.wall, 0.9) : r() < 0.06 ? '#8fa66b' : pick(r, ROOFS);
  return look;
}
const ROOFS = ['#e6e3dc', '#d6d2c9', '#c6c1b6', '#b3aea4', '#dcd8cf', '#a8a59e'];

function lookBody(id: string, arch: Arch, h: number): GenericLook {
  // A second stream so the archetype pick above and these choices never shift each other.
  const r = rng(hashStr(id + ':v2look'));
  const variant = Math.floor(r() * 4) & 3;
  const style = V2_STYLE0 + arch * 4 + variant;
  const split = h >= 12;
  const storey = arch === Arch.Residential ? 3.2 : arch === Arch.Deck ? 3.1 : 4.0;
  // Base of one storey on mid-rises, two on towers.
  const baseH = !split ? 0 : h > 45 && arch !== Arch.Deck ? storey * 2 + 0.6 : storey + 0.6;
  switch (arch) {
    case Arch.Precast: {
      const wall = pick(r, PRECAST);
      // Recessed dark lobby under light piers, or a flush granite plinth.
      const arcade = r() < 0.55;
      return { arch, style, wall, baseH, base: arcade ? '#4d4f50' : '#7a756d', baseStyle: arcade ? BaseStyle.Arcade : BaseStyle.Lobby,
        inset: arcade && split ? 1.2 : 0, capH: split ? (h > 45 ? 3.2 : 1.6) : 0, cap: shade(wall, 1.04), overhang: 0, penthouse: shade(wall, 0.92) };
    }
    case Arch.Banded: {
      const wall = pick(r, BANDED);
      return { arch, style, wall, baseH, base: '#5f5d59', baseStyle: BaseStyle.Lobby, inset: split ? 0.9 : 0,
        capH: split ? (h > 60 ? 4.5 : 2.2) : 0, cap: shade(wall, 0.9), overhang: 0, penthouse: shade(wall, 0.85) };
    }
    case Arch.Brick: {
      const wall = pick(r, BRICK);
      const stone = pick(r, ['#cfc1a6', '#c4b89f', '#d8cdb8']);
      // Low brick: half have a shopfront at the street, all keep a stone coping.
      const shopfront = split || (h >= 7 && r() < 0.5);
      return { arch, style, wall, baseH: split ? baseH : shopfront ? 4.2 : 0, base: r() < 0.5 ? '#5b5550' : stone, baseStyle: BaseStyle.Shopfront, inset: 0,
        capH: split ? 1.1 : 0.7, cap: stone, overhang: split ? 0.45 : 0, penthouse: shade(wall, 0.85) };
    }
    case Arch.Limestone: {
      const wall = pick(r, LIMESTONE);
      return { arch, style, wall, baseH, base: pick(r, ['#8e877c', '#7c776f', '#9b9284']), baseStyle: BaseStyle.Lobby, inset: 0,
        capH: split ? 1.6 : 0, cap: shade(wall, 1.05), overhang: split ? 0.6 : 0, penthouse: shade(wall, 0.9) };
    }
    case Arch.Residential: {
      const wall = pick(r, RESIDENTIAL);
      return { arch, style, wall, baseH, base: pick(r, ['#5e5d5a', '#6c6863', '#4f5254']), baseStyle: BaseStyle.Shopfront, inset: split ? 0.6 : 0,
        capH: split ? 1.4 : 0, cap: pick(r, ['#7a7670', '#8f8a82', '#6b6f72']), overhang: split ? 0.35 : 0, penthouse: '#8f8a82' };
    }
    case Arch.Deck: {
      const wall = pick(r, DECK);
      return { arch, style, wall, baseH: 0, base: wall, baseStyle: BaseStyle.Plinth, inset: 0, capH: split ? 1.0 : 0, cap: shade(wall, 1.03), overhang: 0, penthouse: shade(wall, 0.9) };
    }
    case Arch.Shop: {
      const wall = pick(r, SHOP);
      // Storefront and sign band at the street; a coping line on the parapet.
      return { arch, style, wall, baseH: 4.4, base: wall, baseStyle: BaseStyle.Shopfront, inset: 0, capH: 0.6, cap: shade(wall, 0.8), overhang: 0, penthouse: shade(wall, 0.9) };
    }
    case Arch.Glass: {
      const frame = pick(r, GLASS_FRAME);
      return { arch, style, wall: frame, baseH, base: '#545656', baseStyle: BaseStyle.Lobby, inset: split ? 1.5 : 0,
        capH: split ? (h > 80 ? 6 : 3) : 0, cap: shade(frame, 0.95), overhang: 0, penthouse: shade(frame, 0.9) };
    }
  }
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}

/**
 * The ring moved `d` metres inward (negative: outward), with mitres clamped so sharp corners
 * don't spike. Returns null where the inset would fold (an edge shorter than 3d).
 */
export function offsetRing(ring: P2[], d: number): P2[] | null {
  const n = ring.length;
  let a = 0;
  for (let i = 0; i < n; i++) {
    const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % n];
    a += x0 * z1 - x1 * z0;
    if (Math.hypot(x1 - x0, z1 - z0) < 3 * Math.abs(d)) return null;
  }
  // For a positive shoelace area (x,z), the interior is to the left of each edge: (-dz, dx).
  const s = a > 0 ? 1 : -1;
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const p = ring[(i + n - 1) % n], c = ring[i], q = ring[(i + 1) % n];
    const e0 = norm(c[0] - p[0], c[1] - p[1]), e1 = norm(q[0] - c[0], q[1] - c[1]);
    const n0: P2 = [-e0[1] * s, e0[0] * s], n1: P2 = [-e1[1] * s, e1[0] * s];
    let mx = n0[0] + n1[0], mz = n0[1] + n1[1];
    const dot = n0[0] * n1[0] + n0[1] * n1[1];
    const k = 1 / Math.max(0.25, (1 + dot) / 2);
    const ml = Math.hypot(mx, mz) || 1;
    mx /= ml; mz /= ml;
    const len = Math.sign(d) * Math.min(Math.abs(d) * Math.sqrt(k), Math.abs(d) * 2.5);
    out.push([c[0] + mx * len, c[1] + mz * len]);
  }
  return out;
}
function norm(x: number, z: number): P2 { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; }

/** Dev only: where each archetype landed, for close review shots (window.__genericV2). */
export const v2Samples: { arch: string; id: string; x: number; z: number; h: number; cls: string | null }[] = [];
if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __genericV2: typeof v2Samples }).__genericV2 = v2Samples;
