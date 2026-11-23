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
type Plan = { concave: boolean; porchFoot?: number; shape: Shape; eave: number; rise: number; centre: P2; u: P2; long: number; half: number;
  wall: string; roof: string; trim: string; porch: P2[] | null; chimney: boolean; brick: boolean };

// Early twentieth-century Atlanta streets: red and brown brick, painted
// clapboard and a little stucco; slate-grey and brown asphalt roofs.
const BRICK = ['#8c4a3b', '#9a5a44', '#7e4637', '#a3654e', '#86503f'];
const CLAPBOARD = ['#e6e0cf', '#d8d1bd', '#c3c9b6', '#cbbfa3', '#9aa592', '#b8c4c9', '#e3d6b4'];
const STUCCO = ['#d6c4a2', '#cdb894', '#e0d2b6'];
const ROOFS = ['#77706a', '#6b625a', '#857664', '#646a6e', '#7d6f63', '#5f5a55'];

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

function plan(b: VBuilding, street: (x: number, z: number) => number): Plan | null {
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
  const shape: Shape = !concave && (shapeTag === 'gabled' || shapeTag === 'hipped' || shapeTag === 'pyramidal') ? shapeTag
    : !concave && aspect > 1.3 ? 'gabled' : aspect < 1.12 ? 'pyramidal' : 'hipped';
  const rise = Math.min(4.5, Math.max(1.6, box.half * .72));
  const storeys = b.floors || (b.cls === 'bungalow' || size < 95 ? 1 : 2);
  const eave = b.h ? Math.max(3, b.h - rise) : storeys * 3.05 + .4;
  const kind = material === 'brick' ? 'brick' : material === 'wood' ? 'clapboard' : r() < .45 ? 'brick' : r() < .85 ? 'clapboard' : 'stucco';
  const palette = kind === 'brick' ? BRICK : kind === 'clapboard' ? CLAPBOARD : STUCCO;
  // The porch faces the nearest street from the footprint's longer frontage.
  let porch: P2[] | null = null;
  // Terrace and semi-detached halves share frontage, so they get no porch of their own.
  if (b.cls !== 'terrace' && b.cls !== 'semidetached_house' && r() < .7) {
    let best = Infinity;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], c = ring[(i + 1) % ring.length], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (len < 4) continue;
      const d = street((a[0] + c[0]) / 2, (a[1] + c[1]) / 2);
      if (d < best) { best = d; porch = [a, c]; }
    }
    if (best > 40) porch = null;
  }
  return { concave, shape, eave, rise, centre: box.centre, u: box.u, long: box.long, half: box.half,
    wall: palette[Math.floor(r() * palette.length)], roof: ROOFS[Math.floor(r() * ROOFS.length)],
    trim: kind === 'brick' ? '#e4ddca' : '#f1ece0', porch, chimney: !concave && (kind === 'brick' ? r() < .8 : r() < .45), brick: kind === 'brick' };
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

/**
 * Residential finishes plus the eave-height adjustment, for one board's city.
 * `ground` (the rendered surface, scene metres) lets a lowered eave keep clear of a hillside:
 * such houses get the hillside floor rule from midtown-foundations.
 */
export function residential(city: TerrainCity, existing?: (b: VBuilding) => BuildingFinish | undefined,
  ground?: (x: number, z: number) => number | null, footing?: (b: VBuilding) => number | null) {
  const street = roadIndex(city);
  const plans = new Map<string, Plan>();
  const buildings = city.buildings.map(b => {
    if (existing?.(b)) return b;
    const p = plan(b, street);
    if (!p) return b;
    plans.set(b.id, p);
    // Walls stop at the eave; the pitched roof carries the rest of the height.
    const range = ground && relief(b.rings[0], ground);
    if (p.porch && ground) {
      // The porch deck runs down to the lowest ground under it; drop it if it would stand on stilts.
      const [a, d] = p.porch, len = Math.hypot(d[0] - a[0], d[1] - a[1]);
      let nx = -(d[1] - a[1]) / len, nz = (d[0] - a[0]) / len;
      const mx = (a[0] + d[0]) / 2, mz = (a[1] + d[1]) / 2;
      if ((mx - p.centre[0]) * nx + (mz - p.centre[1]) * nz < 0) { nx = -nx; nz = -nz; }
      const under = [0, .5, 1].flatMap(t => [0, 2.3].map(o => ground(a[0] + (d[0] - a[0]) * t + nx * o, a[1] + (d[1] - a[1]) * t + nz * o)))
        .filter((h): h is number => h !== null);
      p.porchFoot = under.length ? Math.min(...under) : undefined;
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
      wall: p.wall, roof: p.roof, parapet: 0, windowStyle: 3,
      dressRoof(builder, outer, eave) {
        roofFor(p, builder, outer, eave);
        const base = eave - p.eave;
        if (p.chimney) {
          // Brick stack on the ridge line toward one end.
          const t = p.shape === 'pyramidal' ? 0 : p.long * .55, x = p.centre[0] + p.u[0] * t, z = p.centre[1] + p.u[1] * t;
          builder.box(.7, p.rise + 1.6, .9, x, eave - .5 + (p.rise + 1.6) / 2, z, p.brick ? '#6e3b30' : '#8a5444');
        }
        if (p.porch) {
          const [a, d] = p.porch, len = Math.hypot(d[0] - a[0], d[1] - a[1]);
          const ex: P2 = [(d[0] - a[0]) / len, (d[1] - a[1]) / len];
          // Outward normal: away from the footprint centre.
          let n: P2 = [-ex[1], ex[0]];
          const m: P2 = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2];
          if ((m[0] - p.centre[0]) * n[0] + (m[1] - p.centre[1]) * n[1] < 0) n = [-n[0], -n[1]];
          const w = Math.min(len * .6, 6.5), depth = 2.3;
          const at = (s: number, o: number): P2 => [m[0] + ex[0] * s + n[0] * o, m[1] + ex[1] * s + n[1] * o];
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
