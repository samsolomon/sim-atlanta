import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { localLandmarkShell } from './landmark-shell';

export const euhmDeckId = 'osm:way:1021839184';

/**
 * Emory University Hospital Midtown staff deck (HRD Architects, 2020) between
 * Spring Street, Linden Avenue and West Peachtree Street. A white pleated fin
 * screen wraps the parking levels over a dark louvre band and street glazing,
 * with a glass stair tower on the Linden Avenue side near West Peachtree.
 *
 * The mapped outline is cut at the z = -1700 row seam, so north-band and
 * midtown-south each hold a fragment with this id. Each row builds its own
 * physical part from the same world-frame plan (the convention skins-5 uses
 * for The Atlantic), so neither row ever draws the generic box. Heights are
 * NAVD88 so the halves meet at the seam whatever the row's local grade. An
 * uncut outline (both sides of the seam in one ring) builds both halves.
 */
const seamZ = -1700;
const origin: P2 = [314.8, seamZ];
// Local plan: x east, z = world z + 1700 (negative is north, toward Linden).
// midtown-south holds the deck north of the seam; north-band holds the rest of
// the deck and the low south wing.
const deck = { w: -51.6, e: 51.7, n: -34.3, s: 24 };
const wing = { w: -51.7, e: 20.5, n: 24, s: 42.2 };
const stair = { w: 39.6, e: 50.1, n: -46.7, s: -33.7 };

// NAVD88 metres. The site falls 8 m from West Peachtree (307.8) to Spring (299.7).
const base = 299.3,
  glassLo = 307.4,
  plinth = 302.6,
  louvreLo = 312.5,
  screenLo = 315,
  level = 3.2,
  levels = 10,
  deckTop = screenLo + levels * level, // 347
  parapet = 348.8,
  stairTop = 352.2,
  wingTop = 316;

const fin = '#e9e8e3',
  finShade = '#cfcdc6',
  interior = '#45494b',
  slab = '#b8b5ae',
  louvre = '#2e3236',
  concrete = '#a9a69d',
  storefront = '#5b6d78',
  stairGlass = '#5d7f98',
  frame = '#3a4046',
  roofDeck = '#9c9a94';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;
const box = (w: number, e: number, n: number, s: number): P2[] => [[w, n], [e, n], [e, s], [w, s]];

/** Quads offset along a face's outward normal (away from `center`). */
function face(shell: Shell, a: P2, b: P2, center: P2) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  let nx = dz / len, nz = -dx / len;
  if (((a[0] + b[0]) / 2 - center[0]) * nx + ((a[1] + b[1]) / 2 - center[1]) * nz < 0) { nx = -nx; nz = -nz; }
  const at = (t: number, y: number, out: number) => [a[0] + t * dx + nx * out, y, a[1] + t * dz + nz * out];
  return {
    len, dx, dz,
    quad(l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) {
      (lit ? shell.lights : shell.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    },
    /** A horizontal strip at height y, from `in0` to `out0` off the face. */
    flat(l: number, r: number, y: number, in0: number, out0: number, c: string) {
      shell.body.quad(at(l, y, in0), at(l, y, out0), at(r, y, out0), at(r, y, in0), c);
    },
  };
}

export function createEuhmStaffDeck(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  if (site.id !== euhmDeckId || site.rings.length !== 1) return null;
  const ring = site.rings[0];
  const halves = [ring.some(([, z]) => z < seamZ - 0.5), ring.some(([, z]) => z > seamZ + 0.5)]; // [north, south]
  if (!halves[0] && !halves[1]) return null;
  const probes: P2[] = [...(halves[0] ? [[0, -17] as P2] : []), ...(halves[1] ? [[0, 20] as P2] : [])];
  const zero = grid.manifest.vertical.sceneZeroNavd88M;
  // One pinned base keeps the halves level; drop it only if this row's ground is lower.
  const grades = ring.map(([x, z]) => grid.sample(x, z)).filter((y): y is number => y !== null && Number.isFinite(y));
  const bottom = Math.min(base, ...grades.map(y => y - 0.35));
  const s = localLandmarkShell(buildings, site, halves[0] ? 'EUHM staff deck' : 'EUHM staff deck (south)',
    origin, [1, 0], probes, bottom, -zero);
  if (!s) return null;

  for (const south of [false, true]) {
    if (!halves[south ? 1 : 0]) continue;
    // This half of the deck, cut at the seam (z = 0).
    const n0 = south ? 0 : deck.n, s0 = south ? deck.s : 0;
    const center: P2 = [0, (deck.n + deck.s) / 2];
    const part = box(deck.w, deck.e, n0, s0);
    s.prism(part, bottom, louvreLo, storefront, roofDeck);
    s.prism(part, louvreLo, screenLo, louvre, roofDeck);
    s.prism(box(deck.w + 0.8, deck.e - 0.8, south ? 0 : deck.n + 0.8, south ? deck.s - 0.8 : 0), screenLo, deckTop, interior, roofDeck);

    // Exterior faces only; the seam edge is interior. Street = Linden and West Peachtree.
    const faces: { a: P2; b: P2; street: boolean }[] = south
      ? [{ a: [deck.e, 0], b: [deck.e, deck.s], street: true }, { a: [deck.e, deck.s], b: [deck.w, deck.s], street: false },
        { a: [deck.w, deck.s], b: [deck.w, 0], street: false }]
      : [{ a: [deck.w, 0], b: [deck.w, deck.n], street: false }, { a: [deck.w, deck.n], b: [deck.e, deck.n], street: true },
        { a: [deck.e, deck.n], b: [deck.e, 0], street: true }];

    for (const { a, b, street } of faces) {
      const f = face(s, a, b, center);
      // Parapet at the deck edge, and a coping out to the fin screen so the
      // screen hangs from the deck rather than floating 0.75 m off it.
      s.body.quad([a[0], deckTop, a[1]], [a[0], parapet, a[1]], [b[0], parapet, b[1]], [b[0], deckTop, b[1]], finShade);
      f.flat(0, 1, parapet, 0, 0.75, fin);
      // Decks behind the screen: dark interior, with one thin lit strip per
      // level under each slab (the ceiling fixtures), so at night it reads as
      // a lit garage rather than a glowing slab.
      f.quad(0, 1, screenLo, deckTop, 0.02, interior);
      for (let k = 1; k <= levels; k++) {
        const ceil = screenLo + k * level - 0.45;
        f.quad(0, 1, ceil - 1.0, ceil, 0.03, interior, true);
        f.quad(0, 1, ceil, screenLo + k * level, 0.05, slab);
      }
      // Fins on a world 2 m grid (x or z multiples of 2), so both rows' halves line up.
      const along = Math.abs(f.dx) > Math.abs(f.dz);
      const shift = along ? origin[0] : origin[1];
      const start = (along ? a[0] : a[1]) + shift, dir = Math.sign(along ? f.dx : f.dz);
      const from = Math.min(start, start + dir * f.len), to = Math.max(start, start + dir * f.len);
      for (let p = Math.ceil(from / 2) * 2; p <= to; p += 2) {
        const t = (p - start) * dir / f.len;
        const wide = Math.abs(p / 2) % 2 === 0; // alternating pleats
        const half = (wide ? 0.55 : 0.4) / f.len;
        f.quad(Math.max(0, t - half), Math.min(1, t + half), street ? screenLo : plinth, parapet, 0.75, wide ? fin : finShade);
      }
      // Lower levels: a plinth and open parking where the street falls away
      // (Linden drops 8 m toward Spring), then street glazing under the louvres.
      f.quad(0, 1, bottom, plinth, 0.03, concrete);
      f.quad(0, 1, plinth, street ? glassLo : louvreLo, 0.02, interior);
      for (let y = plinth + level; y < (street ? glassLo : louvreLo); y += level) {
        f.quad(0, 1, y - 1.45, y - 0.45, 0.03, interior, true);
        f.quad(0, 1, y - 0.45, y, 0.05, slab);
      }
      if (street) f.quad(0.02, 0.98, glassLo, louvreLo - 0.3, 0.04, storefront, true);
    }
  }

  if (halves[1]) {
    // The low south wing: three open concrete levels.
    s.prism(box(wing.w, wing.e, wing.n, wing.s), bottom, wingTop, concrete, roofDeck);
    const c: P2 = [(wing.w + wing.e) / 2, (wing.n + wing.s) / 2];
    const sides: [P2, P2][] = [[[wing.e, wing.n], [wing.e, wing.s]], [[wing.e, wing.s], [wing.w, wing.s]], [[wing.w, wing.s], [wing.w, wing.n]]];
    for (const [a, b] of sides) {
      const f = face(s, a, b, c);
      for (const y of [305.2, 308.8, 312.4]) f.quad(0.03, 0.97, y, y + 2.2, 0.04, interior);
    }
  }
  if (halves[0]) {
    // Glass stair tower toward Linden Avenue, lit at night.
    s.prism(box(stair.w, stair.e, stair.n, stair.s), bottom, stairTop, stairGlass, frame);
    const c: P2 = [(stair.w + stair.e) / 2, (stair.n + stair.s) / 2];
    const sides: [P2, P2][] = [[[stair.w, stair.s], [stair.w, stair.n]], [[stair.w, stair.n], [stair.e, stair.n]], [[stair.e, stair.n], [stair.e, stair.s]]];
    for (const [a, b] of sides) {
      const f = face(s, a, b, c);
      f.quad(0.04, 0.96, base + 0.3, stairTop - 1.2, 0.03, stairGlass, true);
      for (let y = base + 4; y < stairTop; y += 3.2) f.quad(0, 1, y, y + 0.25, 0.06, frame);
      for (const u of [0, 1 / 3, 2 / 3, 1]) f.quad(Math.max(0, u - 0.18 / f.len), Math.min(1, u + 0.18 / f.len), bottom, stairTop, 0.07, frame);
    }
  }
  return s.finish('#f3ecd9', 0.62);
}
