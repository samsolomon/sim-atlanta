import tagged from '../../../pipeline/prototypes/residential/tags.json';
import type { TerrainCity } from '../terrain/transport-data';
import { hashStr, pointInRing, rng, type Builder, type P2 } from '../vignette/geom';
import type { BuildingFinish, VBuilding } from '../vignette/world';

/**
 * Pitched roofs, porches and chimneys for small residential footprints across
 * the rectangle. OSM roof:shape and building:material are reported where
 * tagged (pipeline/prototypes/residential/tags.json); everything else is
 * inferred from the footprint (shape, storeys) or illustrative (palette,
 * porch, chimney). Heights: OSM height is the ridge, so walls stop at the eave.
 */
const HOMES = new Set(['house', 'detached', 'semidetached_house', 'bungalow', 'terrace']);
const tags = tagged as unknown as Record<string, [string | null, string | null, string | null]>;

type Shape = 'gabled' | 'hipped' | 'pyramidal';
export type HouseStyle = 'colonial' | 'craftsman' | 'tudor';
/** Lab and test overrides: pin a footprint's style, siding, wall colour or storeys. */
export type HouseForce = Partial<{ style: HouseStyle; siding: Siding; wall: string; storeys: number }>;
type Plan = { style: HouseStyle; storeys: number; storeyTier: 'reported' | 'inferred'; doorS: number; id: string;
  concave: boolean; porchFoot?: number; front: P2[] | null; frontFoot?: number; siding: Siding; doorColor: string;
  crossGable: boolean; dormers: number; quality: 'high' | 'low'; shape: Shape; eave: number; rise: number; centre: P2; u: P2; long: number; half: number;
  wall: string; roof: string; trim: string; porch: P2[] | null; chimney: boolean; brick: boolean };

// Material families, each with its own colour range (Sam's notes, checked against Street View
// in Ansley Park and Home Park). Repeated entries weight the common colours.
export type Siding = 'clapboard' | 'brick' | 'stucco' | 'shingle';
export const FAMILIES: Record<Siding, string[]> = {
  // Lap siding: white, cream, pale yellow, sage, grey-blue, muted green; the occasional deep red or navy.
  clapboard: ['#f1eee6', '#f1eee6', '#e8dfc8', '#ecdca0', '#b5bf9c', '#a9b6c1', '#8f9e7c', '#e8dfc8', '#7d3530', '#3d4a5c'],
  // Brick: red-orange, deep red, brown, tan, and some painted white brick.
  brick: ['#a5553b', '#a5553b', '#7e3a2f', '#6f4a38', '#b08f6a', '#e6e2d8'],
  // Cedar shingle: weathered brown or grey.
  shingle: ['#7a6048', '#8a7258', '#8a8780', '#74736c'],
  // Stucco: cream, pink-beige, pale ochre.
  stucco: ['#e6dcc4', '#dcc0ab', '#d8bd86'],
};
// Weathered greys and warm browns, with a little muted green and red; slate and terracotta by era.
const ASPHALT = ['#7b7670', '#6f6a64', '#8a7d6e', '#7a6a5a', '#66706a', '#7d5d52', '#868079', '#6a6f73'];
const SLATE = ['#5f6870', '#58626b'];
const TERRACOTTA = ['#94604c', '#9d6a52', '#87574a'];
const DOORS = ['#2f3a34', '#5b2a24', '#2b2f3a', '#3b2c22', '#6a5d4b', '#1f2224'];
// Shader sidings 7–10: the 3–6 textures without shader windows; houses draw their own windows.
const STYLE: Record<Siding, number> = { clapboard: 7, brick: 8, stucco: 9, shingle: 10 };
/** Ansley Park, roughly Peachtree Street to Piedmont Park and 15th Street to I-85, in scene metres. */
const inAnsley = (x: number, z: number) => x > 800 && x < 1750 && z > -4750 && z < -3700;

function area(ring: P2[]) {
  let a = 0;
  for (let i = 0; i < ring.length; i++) { const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % ring.length]; a += x0 * z1 - x1 * z0; }
  return Math.abs(a) / 2;
}

/** Minimum-area oriented rectangle from the footprint's edge directions. */
function oriented(ring: P2[]) {
  let best: { u: P2; long: number; half: number; centre: P2; area: number } | null = null;
  for (let i = 0; i < ring.length; i++) {
    const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % ring.length], len = Math.hypot(x1 - x0, z1 - z0);
    if (len < .5) continue;
    const u: P2 = [(x1 - x0) / len, (z1 - z0) / len], v: P2 = [-u[1], u[0]];
    const a = ring.map(p => p[0] * u[0] + p[1] * u[1]), b = ring.map(p => p[0] * v[0] + p[1] * v[1]);
    const [a0, a1, b0, b1] = [Math.min(...a), Math.max(...a), Math.min(...b), Math.max(...b)];
    const box = (a1 - a0) * (b1 - b0);
    if (best && box >= best.area) continue;
    const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2, centre: P2 = [u[0] * ca + v[0] * cb, u[1] * ca + v[1] * cb];
    best = a1 - a0 >= b1 - b0
      ? { u, long: (a1 - a0) / 2, half: (b1 - b0) / 2, centre, area: box }
      : { u: v, long: (b1 - b0) / 2, half: (a1 - a0) / 2, centre, area: box };
  }
  return best;
}

function roadIndex(city: TerrainCity) {
  const cells = new Map<string, [P2, P2][]>();
  for (const r of city.roads) {
    if (r.bridge || r.tunnel || ['footway', 'path', 'steps', 'cycleway', 'service'].includes(r.cls)) continue;
    for (let i = 1; i < r.pts.length; i++) {
      const a = r.pts[i - 1], b = r.pts[i];
      for (let x = Math.floor(Math.min(a[0], b[0]) / 40); x <= Math.floor(Math.max(a[0], b[0]) / 40); x++)
        for (let z = Math.floor(Math.min(a[1], b[1]) / 40); z <= Math.floor(Math.max(a[1], b[1]) / 40); z++)
        {
          const key = `${x},${z}`, list = cells.get(key);
          if (list) list.push([a, b]); else cells.set(key, [[a, b]]);
        }
    }
  }
  return (x: number, z: number) => {
    let best = Infinity;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const [a, b] of cells.get(`${Math.floor(x / 40) + i},${Math.floor(z / 40) + j}`) ?? []) {
      const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      best = Math.min(best, Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz));
    }
    return best;
  };
}

function plan(b: VBuilding, street: (x: number, z: number) => number, quality: 'high' | 'low', force?: HouseForce): Plan | null {
  const ring = b.rings[0];
  // Pieces clipped at a board seam (`id/n`) keep the generic box on both sides,
  // since neither half can be roofed as one house.
  if (b.id.includes('/') || b.rings.length !== 1 || !ring || ring.length < 4 || !HOMES.has(b.cls ?? '')) return null;
  const size = area(ring);
  if (size < 25 || size > 450 || (b.floors || 0) > 3 || (b.h ?? 0) > 14) return null;
  const box = oriented(ring);
  if (!box || box.half < 2) return null;
  const [shapeTag, material] = tags[b.id] ?? [null, null, null];
  const r = rng(hashStr(b.id));
  const fill = size / (4 * box.long * box.half), aspect = box.long / box.half;
  // A ridge through an L or courtyard plan would roof empty ground. Concave
  // plans get a low hip-and-deck roof that follows the footprint instead.
  const concave = fill < .85;
  // Tagged shapes win on rectangular plans; otherwise long rectangles gable, compact plans hip.
  let shape: Shape = !concave && (shapeTag === 'gabled' || shapeTag === 'hipped' || shapeTag === 'pyramidal') ? shapeTag
    : !concave && aspect > 1.3 ? 'gabled' : aspect < 1.12 ? 'pyramidal' : 'hipped';
  const ansley = inAnsley(...box.centre);
  const f = force ?? {};
  // Style by neighbourhood (Street View): Ansley Park is Colonial and Tudor revival among
  // Craftsman houses; Home Park and the other side streets are mostly Craftsman bungalows.
  const pickStyle = r();
  const style: HouseStyle = f.style ?? (ansley ? (pickStyle < .35 ? 'colonial' : pickStyle < .65 ? 'tudor' : 'craftsman')
    : (pickStyle < .65 ? 'craftsman' : pickStyle < .9 ? 'colonial' : 'tudor'));
  // Tudor revival is a steep gabled house.
  if (style === 'tudor' && !concave) shape = 'gabled';
  // Pitch by style: low Craftsman roofs, steep Tudor ones.
  const rise = style === 'craftsman' ? Math.min(3.2, Math.max(1.4, box.half * .5))
    : style === 'tudor' ? Math.min(6, Math.max(2.2, box.half * 1.1)) : Math.min(4.5, Math.max(1.6, box.half * .72));
  // Storeys: OSM levels or height are reported; otherwise inferred from style, size and place.
  // A half storey (1.5) is a one-storey eave with dormers in the roof.
  const tagged = b.floors || (b.h ? Math.max(1, Math.round((b.h - rise) / 3)) : 0);
  const storeys = f.storeys ?? (tagged || (style === 'craftsman' ? (size > 110 ? 1.5 : 1)
    : style === 'tudor' ? (ansley ? 2 : 1.5) : ansley || size >= 150 ? 2 : 1));
  const storeyTier = tagged && !f.storeys ? 'reported' : 'inferred';
  const eave = Math.floor(storeys) * 3 + .2;
  const pick = r();
  const kind: Siding = f.siding ?? (material === 'brick' ? 'brick' : material === 'wood' ? 'clapboard'
    : style === 'tudor' ? (pick < .7 ? 'brick' : 'stucco')
    : style === 'colonial' ? (pick < .45 ? 'brick' : pick < .9 ? 'clapboard' : 'shingle')
    : ansley ? (pick < .55 ? 'clapboard' : pick < .85 ? 'shingle' : 'brick') : (pick < .75 ? 'clapboard' : pick < .9 ? 'shingle' : 'brick'));
  const palette = FAMILIES[kind];
  const roofs = kind === 'stucco' && r() < .6 ? TERRACOTTA : (kind === 'brick' || style === 'tudor') && ansley && r() < .25 ? SLATE : ASPHALT;
  // The front is the frontage nearest a mapped street; door, stoop or porch face it.
  let front: P2[] | null = null, best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], c = ring[(i + 1) % ring.length], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (len < 3) continue;
    const d = street((a[0] + c[0]) / 2, (a[1] + c[1]) / 2);
    if (d < best) { best = d; front = [a, c]; }
  }
  if (best > 40) front = null;
  const frontLen = front ? Math.hypot(front[1][0] - front[0][0], front[1][1] - front[0][1]) : 0;
  // Door by style: centred on a Colonial, off-centre under a Craftsman porch, beside a Tudor gable.
  const doorS = style === 'colonial' ? 0 : style === 'craftsman' ? -.2 * frontLen : .22 * frontLen;
  // Craftsman houses nearly always have a porch, Colonials a small portico, Tudors a stoop.
  // Terrace and semi-detached halves share frontage, so they get no porch of their own.
  const porchRoll = r();
  const porch = front && frontLen >= 4 && b.cls !== 'terrace' && b.cls !== 'semidetached_house'
    && porchRoll < (style === 'craftsman' ? .9 : style === 'colonial' ? .45 : .1) ? front : null;
  const along = front ? Math.abs((front[1][0] - front[0][0]) * box.u[0] + (front[1][1] - front[0][1]) * box.u[1]) / frontLen : 0;
  // Tudors always show a steep front gable; others sometimes get a cross gable on a long front.
  const crossRoll = r();
  const crossGable = !concave && shape !== 'pyramidal' && along > .7 && box.long > 4.5 && (style === 'tudor' || crossRoll < .5);
  // Both dormer rolls are always drawn, so a house keeps its colours on either tier.
  // Half storeys always get dormers; under a 2.7 m rise a dormer's roof would cross the main ridge.
  const dormerRoll = r(), pairRoll = r();
  const halfStorey = storeys % 1 !== 0;
  const dormers = !concave && shape === 'gabled' && along > .7 && rise >= 2.7 && quality === 'high'
    ? (halfStorey ? (pairRoll < .5 ? 1 : 2) : dormerRoll < .5 ? 0 : pairRoll < .6 ? 1 : 2) : 0;
  const wall = f.wall ?? palette[Math.floor(r() * palette.length)];
  // Trim: white or cream on siding; contrasting on brick (cream on red and brown, dark on painted white).
  const trim = kind === 'brick' ? (wall === '#e6e2d8' ? '#2f3a34' : '#efe7d2') : r() < .7 ? '#f6f3ea' : '#ece2c8';
  return { style, storeys, storeyTier, doorS, id: b.id, concave, shape, eave, rise, centre: box.centre, u: box.u, long: box.long, half: box.half, front, siding: kind,
    doorColor: DOORS[Math.floor(r() * DOORS.length)], crossGable, dormers, quality,
    wall, roof: roofs[Math.floor(r() * roofs.length)],
    trim, porch, chimney: !concave && (kind === 'brick' || style === 'tudor' ? r() < .8 : r() < .45), brick: kind === 'brick' };
}

/** Edges offset inward by d, intersected pairwise: the deck of a hip-and-deck roof. */
function inset(ring: P2[], d: number): P2[] {
  let signed = 0;
  for (let i = 0; i < ring.length; i++) { const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % ring.length]; signed += x0 * z1 - x1 * z0; }
  const s = signed > 0 ? 1 : -1, n = ring.length;
  const lines = ring.map((a, i) => {
    const c = ring[(i + 1) % n], len = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
    const nx = -(c[1] - a[1]) / len * s, nz = (c[0] - a[0]) / len * s;
    // The left normal of an anticlockwise ring points inside.
    return { p: [a[0] + nx * d, a[1] + nz * d] as P2, v: [(c[0] - a[0]) / len, (c[1] - a[1]) / len] as P2 };
  });
  return ring.map((a, i) => {
    const l0 = lines[(i + n - 1) % n], l1 = lines[i];
    const det = l0.v[0] * l1.v[1] - l0.v[1] * l1.v[0];
    if (Math.abs(det) < 1e-6) return l1.p;
    const t = ((l1.p[0] - l0.p[0]) * l1.v[1] - (l1.p[1] - l0.p[1]) * l1.v[0]) / det;
    return [l0.p[0] + l0.v[0] * t, l0.p[1] + l0.v[1] * t];
  });
}

function roofFor(p: Plan, b: Builder, outer: P2[], eave: number) {
  const { centre: c, u, long, half, rise } = p;
  if (p.concave) {
    // Low hip skirt to an inset deck: it stays over the walls on L and T plans.
    const d = Math.min(1.6, half * .45), top = eave + Math.min(1.4, d * .9), inner = inset(outer, d);
    for (let i = 0; i < outer.length; i++) {
      const j = (i + 1) % outer.length;
      b.quad([outer[i][0], eave, outer[i][1]], [outer[j][0], eave, outer[j][1]], [inner[j][0], top, inner[j][1]], [inner[i][0], top, inner[i][1]], p.roof);
    }
    for (let i = 1; i + 1 < inner.length; i++) b.tri([inner[0][0], top, inner[0][1]], [inner[i][0], top, inner[i][1]], [inner[i + 1][0], top, inner[i + 1][1]], p.roof);
    return;
  }
  const reach = p.shape === 'gabled' ? long + .01 : p.shape === 'pyramidal' ? 0 : Math.max(0, long - half);
  const ridge = (x: number, z: number): number[] => {
    const t = Math.max(-reach, Math.min(reach, (x - c[0]) * u[0] + (z - c[1]) * u[1]));
    return [c[0] + u[0] * t, eave + rise, c[1] + u[1] * t];
  };
  // Clockwise or anticlockwise, every eave edge rises to its nearest ridge point.
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], d = outer[(i + 1) % outer.length];
    const ea = [a[0], eave, a[1]], ed = [d[0], eave, d[1]], ra = ridge(...a), rd = ridge(...d);
    // A gable end is a vertical wall triangle; everything else is roof.
    const vertical = Math.abs(ra[0] - rd[0]) < 1e-3 && Math.abs(ra[2] - rd[2]) < 1e-3 && p.shape === 'gabled';
    const color = vertical ? p.wall : p.roof;
    if (Math.hypot(ra[0] - rd[0], ra[2] - rd[2]) < 1e-3) b.tri(ea, ed, ra, color);
    else b.quad(ea, ed, rd, ra, color);
  }
  if (p.shape === 'gabled') for (const s of [-1, 1]) {
    // Trim the ridge so the rake reads in the ink pass.
    const e = [c[0] + u[0] * s * reach, eave + rise, c[1] + u[1] * s * reach];
    b.box(.12, .12, .12, e[0], e[1], e[2], p.trim);
  }
}

/** Lowest and highest 3DEP ground over the footprint's ring and a 2.5 m interior grid. */
function relief(ring: P2[], ground: (x: number, z: number) => number | null) {
  const points: P2[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], c = ring[(i + 1) % ring.length], n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1])));
    for (let k = 0; k < n; k++) points.push([a[0] + (c[0] - a[0]) * k / n, a[1] + (c[1] - a[1]) * k / n]);
  }
  const xs = ring.map(p => p[0]), zs = ring.map(p => p[1]);
  for (let x = Math.ceil(Math.min(...xs) / 2.5) * 2.5; x < Math.max(...xs); x += 2.5)
    for (let z = Math.ceil(Math.min(...zs) / 2.5) * 2.5; z < Math.max(...zs); z += 2.5)
      if (pointInRing(x, z, ring)) points.push([x, z]);
  const heights = points.map(p => ground(...p)).filter((h): h is number => h !== null);
  return heights.length ? [Math.min(...heights), Math.max(...heights)] : null;
}

/** Frame on a wall edge (the front by default): s along it, o outward. */
function frontFrame(p: Plan, edge: P2[] = p.front!) {
  const [a, d] = edge, len = Math.hypot(d[0] - a[0], d[1] - a[1]);
  const e: P2 = [(d[0] - a[0]) / len, (d[1] - a[1]) / len], m: P2 = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2];
  let n: P2 = [-e[1], e[0]];
  if ((m[0] - p.centre[0]) * n[0] + (m[1] - p.centre[1]) * n[1] < 0) n = [-n[0], -n[1]];
  const at = (s: number, o: number, y: number) => [m[0] + e[0] * s + n[0] * o, y, m[1] + e[1] * s + n[1] * o];
  return { len, e, n, m, at };
}

/** A gable on a sloping wall edge at `s` along it: gable wall, two roof planes into the main slope, a gable window. */
function crossGable(p: Plan, b: Builder, edge: P2[], s: number, eave: number) {
  const { len, at } = frontFrame(p, edge);
  const gw = Math.min(len * .22, 2.6), ga = Math.min(p.rise * (p.style === 'tudor' ? .98 : .9), gw * (p.style === 'tudor' ? 1.7 : .95)), t = ga * p.half / p.rise;
  const l = at(s - gw, .02, eave), r = at(s + gw, .02, eave), apex = at(s, .02, eave + ga), ridge = at(s, -t, eave + ga);
  b.tri(l, r, apex, p.wall);
  b.tri(l, apex, ridge, p.roof);
  b.tri(r, ridge, apex, p.roof);
  b.quad(at(s - .45, .04, eave + ga * .25), at(s + .45, .04, eave + ga * .25), at(s + .45, .04, eave + ga * .62), at(s - .45, .04, eave + ga * .62), '#56656d');
}

/**
 * Windows composed by wall and style, not tiled: a composed front, one or two per storey on
 * the sides, fewer and smaller at the rear, a small attic window in each gable end, and a trim
 * belt between floors so storeys read. About a third of rooms glow at night (`lit`).
 */
function windows(p: Plan, b: Builder, lit: Builder, outer: P2[], base: number, eave: number) {
  const r = rng(hashStr(p.id + '/windows')), floors = Math.floor(p.storeys), high = p.quality === 'high';
  const fn: P2 | null = p.front ? (() => { const f = frontFrame(p); return f.n; })() : null;
  const sameEdge = (a: P2, d: P2) => p.front && Math.hypot(a[0] - p.front[0][0], a[1] - p.front[0][1]) < 1e-6 && Math.hypot(d[0] - p.front[1][0], d[1] - p.front[1][1]) < 1e-6;
  const shutters = p.style === 'colonial' && r() < .55;
  const belt = p.brick ? '#cfc6b4' : p.trim;
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], d = outer[(i + 1) % outer.length], len = Math.hypot(d[0] - a[0], d[1] - a[1]);
    if (len < 1.8) continue;
    const { at, n } = frontFrame(p, [a, d]);
    const role = sameEdge(a, d) ? 'front' : fn && n[0] * fn[0] + n[1] * fn[1] < -.7 ? 'rear' : 'side';
    // Window: trim surround, glass (lit or dark), a meeting rail and, on Colonials, shutters.
    // A paired window is two sashes side by side with a mullion between them.
    const win = (s: number, sill: number, w: number, h: number, paired = false) => {
      const total = paired ? w * 2 + .12 : w;
      if (Math.abs(s) + total / 2 > len / 2 - .3) return;
      const y0 = base + sill, y1 = y0 + h;
      b.quad(at(s - total / 2 - .1, .03, y0 - .1), at(s + total / 2 + .1, .03, y0 - .1), at(s + total / 2 + .1, .03, y1 + .1), at(s - total / 2 - .1, .03, y1 + .1), p.trim);
      const glass = r() < .33 ? lit : b;
      for (const c of paired ? [s - (w + .12) / 2, s + (w + .12) / 2] : [s])
        glass.quad(at(c - w / 2, .045, y0), at(c + w / 2, .045, y0), at(c + w / 2, .045, y1), at(c - w / 2, .045, y1), glass === lit ? '#6b7a80' : '#4c5a60');
      if (high) b.quad(at(s - total / 2, .05, y0 + h * .47), at(s + total / 2, .05, y0 + h * .47), at(s + total / 2, .05, y0 + h * .53), at(s - total / 2, .05, y0 + h * .53), p.trim);
      const w0 = total;
      if (shutters && role === 'front') for (const side of [-1, 1]) {
        const x0 = s + side * (w0 / 2 + .12), x1 = s + side * (w0 / 2 + .5);
        b.quad(at(Math.min(x0, x1), .04, y0), at(Math.max(x0, x1), .04, y0), at(Math.max(x0, x1), .04, y1), at(Math.min(x0, x1), .04, y1), '#26302b');
      }
    };
    for (let k = 0; k < floors; k++) {
      const sill = k * 3 + .9 + (k === 0 && p.porch && role === 'front' ? .4 : 0);
      if (role === 'front') {
        const door = p.doorS;
        const avoid = (s: number) => Math.abs(s - door) < 1.3 && k === 0 ? null : s;
        // Ribbon and cluster lights touch (spacing ≈ their width); Colonial pairs sit symmetrically.
        const ribbon = (centre: number, n: number, step: number) => Array.from({ length: n }, (_, j) => centre + (j - (n - 1) / 2) * step / len);
        const slots = p.style === 'colonial' ? (len > 11 ? [-.3, .3] : [-.27, .27]).concat(k > 0 ? [0] : [])
          : p.style === 'craftsman' ? (k === 0 ? ribbon(.22, 3, .95) : [-.22, .22])
          : (k === 0 ? ribbon(-.2, 3, .8) : [-.2]);
        for (const t of slots) {
          const s = avoid(t * len);
          if (s === null) continue;
          // Colonial pairs; Craftsman ribbons and Tudor clusters are narrower lights set close together.
          if (p.style === 'colonial') win(s, sill, .85, 1.7, len > 7);
          else win(s, sill, p.style === 'tudor' ? .7 : .85, p.style === 'tudor' ? 1.45 : 1.6);
        }
      } else if (role === 'side') {
        const count = len > 9 ? 2 : 1;
        for (let j = 0; j < count; j++) win((count === 1 ? 0 : j ? .22 : -.22) * len, sill, .8, 1.55, p.style === 'colonial');
      } else {
        win(-.25 * len, sill + .3, .75, 1.2);
        if (k === 0 && len > 8) win(.25 * len, sill + .3, .75, 1.2);
      }
    }
    // A trim belt at each floor line, so one, two and three storeys read apart.
    for (let k = 1; k < floors; k++) {
      const y = base + k * 3 + .02;
      b.quad(at(-len / 2, .035, y), at(len / 2, .035, y), at(len / 2, .035, y + .14), at(-len / 2, .035, y + .14), belt);
    }
    // Attic window in each gable end (walls across the ridge on a gabled roof).
    if (p.shape === 'gabled' && !p.concave && Math.abs((d[0] - a[0]) * p.u[0] + (d[1] - a[1]) * p.u[1]) / len < .3 && len < p.half * 2.2)
      win(0, eave - base + p.rise * .3, .7, .8);
  }
}

/** Door, stoop, corner boards, cross gables and dormers. */
function houseDetail(p: Plan, b: Builder, outer: P2[], eave: number, base: number) {
  if (p.front) {
    const { len, at } = frontFrame(p);
    // Front door with a white surround; under the porch, or on a stoop with steps.
    // Under a porch the door stands on the deck (0.55 m up); otherwise on the floor, above a stoop.
    const s = p.doorS, sill = p.porch ? .55 : 0;
    b.quad(at(s - .62, .03, base + sill + .05), at(s + .62, .03, base + sill + .05), at(s + .62, .03, base + sill + 2.4), at(s - .62, .03, base + sill + 2.4), p.trim);
    b.quad(at(s - .48, .05, base + sill + .1), at(s + .48, .05, base + sill + .1), at(s + .48, .05, base + sill + 2.2), at(s - .48, .05, base + sill + 2.2), p.doorColor);
    if (!p.porch) {
      const foot = Math.min(base - .2, p.frontFoot ?? base - .2), rise = base - foot;
      const box = (s0: number, s1: number, o0: number, o1: number, y0: number, y1: number, c: string) => {
        const q = [at(s0, o0, 0), at(s1, o0, 0), at(s1, o1, 0), at(s0, o1, 0)];
        b.quad(...q.map(v => [v[0], y1, v[2]]) as [number[], number[], number[], number[]], c);
        for (let k = 0; k < 4; k++) b.quad([q[k][0], y0, q[k][2]], [q[(k + 1) % 4][0], y0, q[(k + 1) % 4][2]], [q[(k + 1) % 4][0], y1, q[(k + 1) % 4][2]], [q[k][0], y1, q[k][2]], c);
      };
      box(s - .85, s + .85, 0, 1.3, foot - .2, base, '#9a948a');
      const steps = Math.min(6, Math.ceil(rise / .18));
      for (let k = 1; k < steps; k++) box(s - .75, s + .75, 1.3 + (k - 1) * .3, 1.3 + k * .3, foot - .2, base - rise * k / steps, '#9a948a');
    }
  }
  if (p.quality === 'high' && (p.siding === 'clapboard' || p.siding === 'shingle')) {
    // White corner boards on painted and shingled walls, 2 cm proud of each wall along its own outward normal.
    for (let i = 0; i < outer.length; i++) {
      const v = outer[i], prev = outer[(i + outer.length - 1) % outer.length], next = outer[(i + 1) % outer.length];
      for (const o of [prev, next]) {
        const l = Math.hypot(o[0] - v[0], o[1] - v[1]) || 1, ux = (o[0] - v[0]) / l, uz = (o[1] - v[1]) / l;
        let nx = -uz, nz = ux;
        const mx = (v[0] + o[0]) / 2, mz = (v[1] + o[1]) / 2;
        if ((mx - p.centre[0]) * nx + (mz - p.centre[1]) * nz < 0) { nx = -nx; nz = -nz; }
        const ox = nx * .02, oz = nz * .02;
        b.quad([v[0] + ox, base + .75, v[1] + oz], [v[0] + ux * .16 + ox, base + .75, v[1] + uz * .16 + oz], [v[0] + ux * .16 + ox, eave, v[1] + uz * .16 + oz], [v[0] + ox, eave, v[1] + oz], p.trim);
      }
    }
  }
  // Long plans read as barns under one ridge: break them with side gables, staggered
  // toward opposite ends, on both long walls.
  if (!p.concave && p.shape !== 'pyramidal' && p.long > 2 * p.half && p.long > 4.5) {
    const sides = outer.map((a, i) => [a, outer[(i + 1) % outer.length]] as P2[]).filter(([a, d]) => {
      const len = Math.hypot(d[0] - a[0], d[1] - a[1]);
      const isFront = p.front && Math.hypot(a[0] - p.front[0][0], a[1] - p.front[0][1]) < 1e-6 && Math.hypot(d[0] - p.front[1][0], d[1] - p.front[1][1]) < 1e-6;
      return len > p.long * 1.6 && Math.abs((d[0] - a[0]) * p.u[0] + (d[1] - a[1]) * p.u[1]) / len > .9 && !isFront;
    });
    sides.forEach((edge, k) => crossGable(p, b, edge, (k % 2 ? .25 : -.25) * Math.hypot(edge[1][0] - edge[0][0], edge[1][1] - edge[0][1]), eave));
  }
  if (!p.front) return;
  const { len, at } = frontFrame(p);
  // The front slope climbs `rise` over `half` metres inward from the front wall.
  const roofAt = (t: number) => eave + p.rise * Math.min(1, t / p.half);
  if (p.crossGable) crossGable(p, b, p.front, 0, eave);
  for (let k = 0; k < p.dormers; k++) {
    // Gabled dormers on the front slope, set back a third of the way up.
    // Beside a cross gable, dormers move out toward the ends rather than colliding with it.
    const spread = p.crossGable ? .32 : .26;
    const s = (p.dormers === 1 ? (p.crossGable ? spread : 0) : k ? spread : -spread) * len, t0 = p.half * .35, y0 = roofAt(t0), top = y0 + 1.25, w = .85;
    if (p.crossGable && Math.abs(s) < 2.8) continue;
    const t1 = (top + .5 - eave) * p.half / p.rise;
    b.quad(at(s - w, -t0, y0), at(s + w, -t0, y0), at(s + w, -t0, top), at(s - w, -t0, top), p.wall);
    b.quad(at(s - .45, -t0 + .02, y0 + .25), at(s + .45, -t0 + .02, y0 + .25), at(s + .45, -t0 + .02, top - .2), at(s - .45, -t0 + .02, top - .2), '#56656d');
    const tTop = (top - eave) * p.half / p.rise;
    for (const side of [-w, w]) b.tri(at(s + side, -t0, y0), at(s + side, -t0, top), at(s + side, -tTop, top), p.wall);
    b.tri(at(s - w - .1, -t0 + .15, top), at(s + w + .1, -t0 + .15, top), at(s, -t0 + .15, top + .5), p.wall);
    b.quad(at(s - w - .1, -t0 + .15, top), at(s, -t0 + .15, top + .5), at(s, -t1, top + .5), at(s - w - .1, -tTop, top), p.roof);
    b.quad(at(s, -t0 + .15, top + .5), at(s + w + .1, -t0 + .15, top), at(s + w + .1, -tTop, top), at(s, -t1, top + .5), p.roof);
  }
}

/**
 * Residential finishes plus the eave-height adjustment, for one board's city.
 * `ground` (the rendered surface, scene metres) lets a lowered eave keep clear of a hillside:
 * such houses get the hillside floor rule from midtown-foundations.
 */
export function residential(city: TerrainCity, existing?: (b: VBuilding) => BuildingFinish | undefined,
  ground?: (x: number, z: number) => number | null, footing?: (b: VBuilding) => number | null, quality: 'high' | 'low' = 'high',
  force?: Record<string, HouseForce>) {
  const street = roadIndex(city);
  const plans = new Map<string, Plan>();
  const buildings = city.buildings.map(b => {
    if (existing?.(b)) return b;
    const p = plan(b, street, quality, force?.[b.id]);
    if (!p) return b;
    plans.set(b.id, p);
    // Walls stop at the eave; the pitched roof carries the rest of the height.
    const range = ground && relief(b.rings[0], ground);
    if (p.front && ground) {
      // Porch decks and stoops run down to the lowest ground in front; a porch on stilts is dropped.
      const [a, d] = p.front, len = Math.hypot(d[0] - a[0], d[1] - a[1]);
      let nx = -(d[1] - a[1]) / len, nz = (d[0] - a[0]) / len;
      const mx = (a[0] + d[0]) / 2, mz = (a[1] + d[1]) / 2;
      if ((mx - p.centre[0]) * nx + (mz - p.centre[1]) * nz < 0) { nx = -nx; nz = -nz; }
      const under = [0, .5, 1].flatMap(t => [0, 2.3].map(o => ground(a[0] + (d[0] - a[0]) * t + nx * o, a[1] + (d[1] - a[1]) * t + nz * o)))
        .filter((h): h is number => h !== null);
      p.porchFoot = p.frontFoot = under.length ? Math.min(...under) : undefined;
    }
    // World stands walls on `footing` unless a floor is already fitted.
    const base = b.floorY ?? footing?.(b) ?? range?.[0];
    let floorY: number | undefined;
    if (range && base !== undefined && base !== null && base + p.eave < range[1] + .1) {
      const [low, high] = range;
      // Same rule as the baked hillside grades: mid-grade, raised for a door uphill.
      floorY = Math.max((low + high) / 2, high - p.eave + Math.min(p.eave, 2.4));
    }
    const floor = floorY ?? b.floorY ?? base ?? undefined;
    if (p.porch && floor !== undefined && p.porchFoot !== undefined && floor + .55 - p.porchFoot > 1.5) p.porch = null;
    return floorY === undefined ? { ...b, h: p.eave, floors: null } : { ...b, h: p.eave, floors: null, floorY };
  });
  const finishFor = (b: VBuilding): BuildingFinish | undefined => {
    const own = existing?.(b);
    if (own) return own;
    const p = plans.get(b.id);
    if (!p) return undefined;
    return {
      wall: p.wall, roof: p.roof, parapet: 0, windowStyle: STYLE[p.siding],
      dressRoof(builder, outer, eave, litGlass) {
        roofFor(p, builder, outer, eave);
        const base = eave - p.eave;
        windows(p, builder, litGlass, outer, base, eave);
        if (p.chimney) {
          // Brick stack on the ridge line toward one end.
          const t = p.shape === 'pyramidal' ? 0 : p.long * .55, x = p.centre[0] + p.u[0] * t, z = p.centre[1] + p.u[1] * t;
          builder.box(.7, p.rise + 1.6, .9, x, eave - .5 + (p.rise + 1.6) / 2, z, p.brick ? '#6e3b30' : '#8a5444');
        }
        houseDetail(p, builder, outer, eave, base);
        if (p.porch) {
          const [a, d] = p.porch, len = Math.hypot(d[0] - a[0], d[1] - a[1]);
          const ex: P2 = [(d[0] - a[0]) / len, (d[1] - a[1]) / len];
          // Outward normal: away from the footprint centre.
          let n: P2 = [-ex[1], ex[0]];
          const m: P2 = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2];
          if ((m[0] - p.centre[0]) * n[0] + (m[1] - p.centre[1]) * n[1] < 0) n = [-n[0], -n[1]];
          // Centred on the door: a full porch on Craftsman houses, a small portico on Colonials.
          const w = p.style === 'colonial' ? Math.min(3.2, len * .4) : Math.min(len * .6, 6.5), depth = p.style === 'colonial' ? 1.8 : 2.3;
          const c0 = Math.max(-len / 2 + w / 2, Math.min(len / 2 - w / 2, p.doorS));
          const at = (s: number, o: number): P2 => [m[0] + ex[0] * (s + c0) + n[0] * o, m[1] + ex[1] * (s + c0) + n[1] * o];
          // Deck, four posts and a shallow roof, built from axis-free quads so they follow the frontage.
          const quadBox = (s0: number, s1: number, o0: number, o1: number, y0: number, y1: number, color: string) => {
            const q = [at(s0, o0), at(s1, o0), at(s1, o1), at(s0, o1)];
            const top = q.map(([x, z]) => [x, y1, z]), bot = q.map(([x, z]) => [x, y0, z]);
            builder.quad(top[0], top[1], top[2], top[3], color);
            for (let k = 0; k < 4; k++) builder.quad(bot[k], bot[(k + 1) % 4], top[(k + 1) % 4], top[k], color);
          };
          quadBox(-w / 2, w / 2, 0, depth, Math.min(base - .3, (p.porchFoot ?? base) - .2), base + .55, '#8d857a');
          for (const s of [-w / 2 + .15, -w / 6, w / 6, w / 2 - .15]) quadBox(s - .09, s + .09, depth - .25, depth - .07, base + .55, base + 2.85, p.trim);
          quadBox(-w / 2 - .15, w / 2 + .15, -.05, depth + .2, base + 2.85, base + 3.05, p.roof);
        }
      },
    };
  };
  return { city: { ...city, buildings }, finishFor, count: plans.size };
}
