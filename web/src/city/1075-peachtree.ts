import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

/**
 * 1075 Peachtree (2010, now the PwC tower): dark blue-green curtain glass in two masses, a south
 * block under a louvred crown and a thin cantilevered roof brim, and a flat-topped north block
 * on 12th Street, over a beige precast parking podium shared with the Loews block. The mapped
 * outline is split across the midtown-upper and midtown-central tiles. Evidence, estimates and
 * night notes: docs/log/ui/1075-peachtree/README.md.
 */
export const peachtree1075Id = 'osm:way:234935278';
const crownBlockId = 'osm:way:1434982572';
// The pipeline labels the north block "podium" at an inferred 18.8 m; lidar has its roof at 140 m.
const northBlockId = 'podium';
const canopyId = 'osm:way:1434982570';
// The two-storey glazed corner at Peachtree and 12th.
const cornerId = 'osm:way:1434982571';

/**
 * Roofs in NAVD88 metres from the 22 April 2019 3DEP returns (median roof, or the 95th percentile
 * where a parapet or brim is the edge people see). The mapped tags (18.8 to 45.4 m) disagree.
 */
const roofs: Record<string, number> = {
  [northBlockId]: 433.1,
  'osm:way:234935282': 332.4,
  'osm:way:1434982552': 323.6,
  'osm:way:1434982573': 323.2,
  'osm:way:1434982574': 306.8,
};
// The crown block: glass to the mechanical roof, a louvred screen, then the brim (p95 445.2).
const glassTop = 431.6, louvreTop = 443.6, brimTop = 445.2;
const pitch = 4.1;

const glass = '#46606e', glassLit = '#486271', mullion = '#667b84', band = '#526b78';
const louvre = '#c6c9c4', soffit = '#d9dbd6', brimTopColor = '#a9aca8';
const precast = '#cbbd9f', precastDark = '#b5a78c', screen = '#a8a497', deck = '#8f8d86';
const storefront = '#33434a', lobby = '#3e4f63';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
/** Street grade under an edge, NAVD88 metres. */
type Grade = (a: P2, b: P2) => number;
interface Solid { plan: P2[]; top: number }

/** Counter-clockwise in (x, z) so the outward normal of edge a→b is (dz, -dx)/length. */
function ccw(ring: P2[]): P2[] {
  let area = 0;
  ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; area += x * b - a * z; });
  return area > 0 ? ring : [...ring].reverse();
}

/** Drop vertices closer than `min` metres, so the traced curves stay cheap to band. */
function simplify(ring: P2[], min: number): P2[] {
  const out: P2[] = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= min) out.push(p);
  }
  const first = out[0], last = out[out.length - 1];
  if (out.length > 3 && Math.hypot(first[0] - last[0], first[1] - last[1]) < min) out.pop();
  return out;
}

/** Offset a CCW ring by `d` metres along vertex bisectors, clamped at sharp corners. */
function offset(ring: P2[], d: number): P2[] {
  const normal = (a: P2, b: P2) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    return [dz / l, -dx / l];
  };
  return ring.map((p, i) => {
    const [ax, az] = normal(ring[(i + ring.length - 1) % ring.length], p);
    const [bx, bz] = normal(p, ring[(i + 1) % ring.length]);
    const ml = Math.hypot(ax + bx, az + bz) || 1, mx = (ax + bx) / ml, mz = (az + bz) / ml;
    const scale = Math.min(2, 1 / Math.max(0.5, mx * ax + mz * az));
    return [p[0] + mx * d * scale, p[1] + mz * d * scale];
  });
}

/**
 * Calls `draw` for each edge with the height above which it is exposed: a neighbour mass that
 * covers the ground just outside the edge hides the wall up to that neighbour's roof.
 */
function exposed(plan: P2[], solids: Solid[], self: Solid, draw: (a: P2, b: P2, length: number, from: number, index: number) => void) {
  plan.forEach((a, i) => {
    const b = plan[(i + 1) % plan.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < 0.4) return;
    let from = -Infinity;
    for (const t of [0.25, 0.5, 0.75]) {
      const x = a[0] + t * dx + 1.2 * dz / length, z = a[1] + t * dz - 1.2 * dx / length;
      let cover = -Infinity;
      for (const other of solids) if (other !== self && pointInRing(x, z, other.plan)) cover = Math.max(cover, other.top);
      from = t === 0.25 ? cover : Math.min(from, cover);
    }
    draw(a, b, length, from, i);
  });
}

/** A stable value in [0, 1) per pane, without the row and column streaks of a linear mix. */
function hash(a: number, b: number, c: number) {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1) ^ Math.imul(c, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** A face panel on edge a→b between t0..t1 and heights lo..hi, pushed `out` metres outward. */
function panel(s: Shell, a: P2, b: P2, t0: number, t1: number, lo: number, hi: number, out: number, color: string, lit = false) {
  if (hi - lo < 0.05) return;
  const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
  const p = (t: number, y: number) => [a[0] + t * dx + out * dz / length, y, a[1] + t * dz - out * dx / length];
  (lit ? s.lights : s.body).quad(p(t0, lo), p(t0, hi), p(t1, hi), p(t1, lo), color);
}

/** Floor lines, the vertical mullion rhythm and a sparse, stable set of lit office panes. */
function curtain(s: Shell, plan: P2[], solids: Solid[], self: Solid, grade: Grade, hi: number, seed: number) {
  exposed(plan, solids, self, (a, b, length, from, edge) => {
    const bottom = Math.max(grade(a, b) + 8.6, from);
    if (hi - bottom < 1) return;
    const bays = Math.max(1, Math.round(length / 4.6)), ribs = Math.max(1, Math.round(length / 9.2));
    // Short chords of the curves go without floor lines; at City range they read as one face.
    if (length >= 5) for (let y = hi - pitch; y > bottom; y -= pitch) panel(s, a, b, 0, 1, y - 0.3, y, 0.05, band);
    // Paired-module mullions; the 1.5 m mullions themselves would shimmer at City range.
    for (let i = 1; i < ribs; i++) {
      const w = 0.15 / length;
      panel(s, a, b, i / ribs - w, i / ribs + w, bottom, hi, 0.06, mullion);
    }
    let floor = 0;
    for (let y = hi - pitch; y - pitch > bottom; y -= pitch, floor++) {
      for (let i = 0; i < bays; i++) {
        // Offices at 23:30: about one pane in twenty, fewer near the top.
        if (hash(floor, i, edge * 31 + seed) >= (floor < 4 ? 0.03 : 0.05)) continue;
        panel(s, a, b, i / bays + 0.04 / bays, (i + 1) / bays - 0.04 / bays, y - pitch + 0.12, y - 0.42, 0.035, glassLit, true);
      }
    }
  });
}

/** Beige precast parking podium: pilasters, recessed garage screens and a dark retail base. */
function podium(s: Shell, self: Solid, solids: Solid[], grade: Grade) {
  s.prism(self.plan, s.base, self.top, precast, deck);
  exposed(self.plan, solids, self, (a, b, length, from) => {
    if (length < 6 || from >= self.top - 2) return;
    const street = grade(a, b), ground = Math.max(street, from);
    if (ground <= street + 1) panel(s, a, b, 0.02, 0.98, street + 0.3, street + 4.4, 0.06, storefront);
    const bays = Math.max(1, Math.round(length / 8.4)), pier = Math.min(0.2, 1.1 / length);
    const screenLo = Math.max(ground + 1, street + 5.6), screenHi = self.top - 1.9;
    if (screenHi - screenLo < 2) return;
    for (let i = 0; i < bays; i++) panel(s, a, b, i / bays + pier / 2, (i + 1) / bays - pier / 2, screenLo, screenHi, 0.05, screen);
    // Precast spandrels every third garage level (about 9.6 m) split the screens into panels.
    for (let y = screenLo + 9.6; y < screenHi - 3; y += 9.6) panel(s, a, b, 0, 1, y - 0.45, y + 0.45, 0.08, precast);
    panel(s, a, b, 0, 1, screenHi, screenHi + 0.5, 0.1, precastDark);
  });
}

export function create1075Peachtree(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const crownPart = site.parts?.find(part => part.id === crownBlockId);
  // The central-tile fragment has no tower: a point inside its podium anchors the shell.
  const origin: P2 = crownPart ? [815, -3330] : [820, -3280];
  const s = landmarkShell(buildings, grid, site.id, '1075 Peachtree', origin, [1, 0], [[0, 0]]);
  if (!s) return null;
  const floor = s.base + 0.35;
  const grade: Grade = (a, b) => {
    const ys = [a, b].map(([x, z]) => grid.sample(x + origin[0], z + origin[1]) ?? floor);
    return Math.max(floor, Math.min(...ys));
  };
  const local = (ring: [number, number][]): P2[] => ccw(ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]));

  const solids: Solid[] = [];
  let crown: Solid | null = null, north: Solid | null = null;
  let canopy: P2[] | null = null;
  for (const part of site.parts ?? []) {
    if (part.rings.length !== 1) continue;
    const plan = local(part.rings[0]);
    if (part.id === canopyId) { canopy = plan; continue; }
    if (part.id === cornerId) { s.prism(plan, s.base, floor + part.h, storefront, '#7f8582'); continue; }
    const solid: Solid = part.id === crownBlockId ? { plan: simplify(plan, 3), top: glassTop }
      : part.id === northBlockId ? { plan: simplify(plan, 3.5), top: roofs[northBlockId] }
      : { plan, top: roofs[part.id] ?? floor + part.h };
    if (part.id === crownBlockId) crown = solid;
    else if (part.id === northBlockId) north = solid;
    solids.push(solid);
  }

  for (const solid of solids) if (solid !== crown && solid !== north) podium(s, solid, solids, grade);
  // The curved corner canopy at 12th Street is a thin slab.
  if (canopy) s.prism(canopy, floor + 6.9, floor + 7.5, soffit, brimTopColor);

  /** Double-height lobby glazing on the faces that reach the street, warm all night. */
  const base = (solid: Solid) => exposed(solid.plan, solids, solid, (a, b, length, from) => {
    const street = grade(a, b);
    if (from > street + 1 || length < 3) return;
    panel(s, a, b, 0, 1, street + 0.2, street + 8.2, 0.05, lobby, true);
    panel(s, a, b, 0, 1, street + 8.2, street + 8.6, 0.08, mullion);
    const mullions = Math.round(length / 3);
    for (let i = 1; i < mullions; i++) panel(s, a, b, i / mullions - 0.1 / length, i / mullions + 0.1 / length, street + 0.2, street + 8.2, 0.08, mullion);
  });

  if (north) {
    s.prism(north.plan, s.base, north.top, glass, '#7f8582');
    curtain(s, north.plan, solids, north, grade, north.top - 0.4, 7);
    base(north);
    s.prism(offset(north.plan, -0.6), north.top, north.top + 1.4, '#6f7a7c', '#868b88');
    s.prism(local([[812, -3362], [838, -3362], [838, -3352], [812, -3352]]), north.top, north.top + 3.6, '#b3b6b1', '#9a9d99');
  }

  if (crown) {
    s.prism(crown.plan, s.base, glassTop, glass, glass);
    curtain(s, crown.plan, solids, crown, grade, glassTop, 3);
    base(crown);
    // The louvred screen around the mechanical roof glows evenly at night.
    s.prism(crown.plan, glassTop, glassTop + 1.2, louvre, '#8e908c');
    for (let i = 0; i < crown.plan.length; i++) {
      const a = crown.plan[i], b = crown.plan[(i + 1) % crown.plan.length];
      panel(s, a, b, 0, 1, glassTop, louvreTop, 0.02, louvre, true);
    }
    // The cantilevered brim: a ring about 2.6 m beyond the glass and 3 m inside it.
    const outer = offset(crown.plan, 2.6), inner = offset(crown.plan, -3);
    for (let i = 0; i < outer.length; i++) {
      const j = (i + 1) % outer.length;
      const [oa, ob, ia, ib] = [outer[i], outer[j], inner[i], inner[j]];
      s.body.quad([oa[0], brimTop, oa[1]], [ob[0], brimTop, ob[1]], [ib[0], brimTop, ib[1]], [ia[0], brimTop, ia[1]], brimTopColor);
      s.body.quad([oa[0], louvreTop, oa[1]], [ob[0], louvreTop, ob[1]], [ib[0], louvreTop, ib[1]], [ia[0], louvreTop, ia[1]], soffit);
      s.body.quad([oa[0], louvreTop, oa[1]], [oa[0], brimTop, oa[1]], [ob[0], brimTop, ob[1]], [ob[0], louvreTop, ob[1]], soffit);
    }
    s.prism(local([[804, -3336], [832, -3338], [832, -3322], [804, -3322]]), glassTop + 1.2, glassTop + 5.8, '#a7aaa5', '#93968f');
  }
  return s.finish('#f2ead9', 0.62);
}
