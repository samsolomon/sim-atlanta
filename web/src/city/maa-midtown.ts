import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * MAA Midtown, the 25-storey apartment slab between West Peachtree and Peachtree Walk at 11th.
 * Heights are NAVD88 metres from the April 2019 3DEP lidar, which disagrees with the mapped 98 m:
 * the north slab on 11th Street rises to 386.5 m and the south block toward Peachtree Walk stops
 * at 381.5 m over a 302.6 m street (about 84 and 79 m), with the rooftop pavilion on the north
 * slab to 389.7 m. City z grows to the south. (docs/log/ui/maa-midtown/README.md)
 * Flat vertex colours, no library surfaces: a painted body is a hooked material that costs its own
 * low-tier draw and shader program.
 */
export const maaMidtownId = 'osm:way:536886485';
const towerPart = 'osm:way:886034008';
const garagePart = 'osm:way:886034000';
const origin: P2 = [457, -3212];
/** The north slab meets the south block here (world z). */
const blockZ = -3207;

const brick = '#9b6b58',
  brickShade = '#8a5e4d',
  glass = '#adb5b9',
  white = '#e9e6df',
  recess = '#a29a92',
  garage = '#c7bba6',
  band = '#e1dccf',
  roof = '#8f8a80',
  /** Corner glass: low saturation, because the shaded north face renders far bluer than its base. */
  cornerGlass = '#b0b8bd';

const northRoof = 386.5,
  southRoof = 381.5,
  pavilionTop = 389.7,
  slabBase = 327.5,
  garageTop = 327,
  floor = 3.1;

/** The part of a counter-clockwise polygon where `side(p) >= 0`. */
function clip(plan: P2[], side: (p: P2) => number): P2[] {
  const out: P2[] = [];
  plan.forEach((p, i) => {
    const q = plan[(i + 1) % plan.length], sp = side(p), sq = side(q);
    if (sp >= 0) out.push(p);
    if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  });
  return out;
}

/** Drops short and collinear edges, for facade layout only; prisms use the mapped ring. */
function tidy(ring: P2[], min = 1): P2[] {
  const kept: P2[] = [];
  for (const p of ring) {
    const last = kept.at(-1);
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > min) kept.push(p);
  }
  if (kept.length > 3 && Math.hypot(kept[0][0] - kept.at(-1)![0], kept[0][1] - kept.at(-1)![1]) <= min) kept.pop();
  return kept.filter((p, i) => {
    const a = kept[(i + kept.length - 1) % kept.length], b = kept[(i + 1) % kept.length];
    const ux = p[0] - a[0], uz = p[1] - a[1], vx = b[0] - p[0], vz = b[1] - p[1];
    return Math.abs(ux * vz - uz * vx) / (Math.hypot(ux, uz) * Math.hypot(vx, vz)) > 0.05 || ux * vx + uz * vz < 0;
  });
}

export function createMaaMidtown(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const tower = site.parts?.find(part => part.id === towerPart);
  const podium = site.parts?.find(part => part.id === garagePart);
  if (tower?.rings.length !== 1 || podium?.rings.length !== 1) return null;
  const s = landmarkShell(buildings, grid, site.id, 'MAA Midtown', origin, [1, 0], [[0, 0], [-10, -30], [5, 30]]);
  if (!s) return null;
  const seed = seedOf(site.id);
  const local = (ring: P2[]): P2[] => {
    const plan = ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]);
    const area = plan.reduce((sum, [x, z], i) => sum + x * plan[(i + 1) % plan.length][1] - plan[(i + 1) % plan.length][0] * z, 0);
    return area < 0 ? plan.reverse() : plan;
  };
  const gradeAt = (u: number, v: number) => grid.sample(u + origin[0], v + origin[1]) ?? s.base;

  type Face = { a: P2; b: P2; length: number; n: P2 };
  const faces = (plan: P2[]): Face[] => plan.map((a, i) => {
    const b = plan[(i + 1) % plan.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { a, b, length, n: [(b[1] - a[1]) / length, -(b[0] - a[0]) / length] as P2 };
  }).filter(f => f.length > 0.5);
  const at = (f: Face, t: number, y: number, depth: number) =>
    [f.a[0] + t * (f.b[0] - f.a[0]) + depth * f.n[0], y, f.a[1] + t * (f.b[1] - f.a[1]) + depth * f.n[1]];
  const panel = (f: Face, l: number, r: number, lo: number, hi: number, depth: number, color: string, lit = false) =>
    (lit ? s.lights : s.body).quad(at(f, l, lo, depth), at(f, l, hi, depth), at(f, r, hi, depth), at(f, r, lo, depth), color);

  const towerPlan = local(tower.rings[0]);
  const podiumPlan = local(podium.rings[0]);
  const seam = blockZ - origin[1];
  const north = clip(towerPlan, p => seam - p[1]), south = clip(towerPlan, p => p[1] - seam);

  // Garage podium: pale precast with a light band per parking level, brick under the tower.
  s.prism(podiumPlan, s.base, garageTop, garage, roof);
  for (const f of faces(tidy(podiumPlan))) {
    if (f.length < 4) continue;
    const mid = at(f, 0.5, 0, 0), y0 = gradeAt(mid[0], mid[2]);
    for (let y = y0 + 4.5; y < garageTop - 1.5; y += 3.4) panel(f, 0, 1, y, y + 1.1, 0.05, band);
  }
  s.prism(towerPlan, s.base, slabBase, brick, roof);
  for (const f of faces(tidy(towerPlan))) {
    const mid = at(f, 0.5, 0, 0), behind = at(f, 0.5, 0, 1);
    // Parking levels show on every street face; faces against the garage stay plain.
    if (f.length < 4 || pointInRing(behind[0], behind[2], podiumPlan)) continue;
    const y0 = gradeAt(mid[0], mid[2]);
    for (let y = y0 + 4.5; y < slabBase - 2; y += 3.4) panel(f, 0, 1, y, y + 1.1, 0.05, band);
  }

  /**
   * Brick slab: a glass strip per window bay behind a brick band per floor makes the window grid,
   * and every third bay is a recessed balcony stack in white frames. Residential rooms are
   * noticeably lit at night (illustrative occupancy).
   */
  const slab = (plan: P2[], top: number, face0: number) => {
    s.prism(plan, slabBase, top, brick, roof);
    faces(tidy(plan)).forEach((f, edge) => {
      const mid = at(f, 0.5, 0, 0);
      // The seam between the blocks is inside the building; the north face is the glass corner.
      if (f.length < 6 || Math.abs(mid[2] - seam) < 0.1 || (plan === north && f.n[1] < -0.7)) return;
      const floors = Math.floor((top - 1.5 - slabBase) / floor);
      const bays = Math.max(2, Math.round(f.length / 4.6));
      for (let k = 0; k < bays; k++) {
        const l = (k + 0.18) / bays, r = (k + 0.82) / bays;
        const balcony = k % 3 === 1;
        panel(f, l, r, slabBase + 0.8, top - 1.6, 0.03, balcony ? recess : glass);
        if (balcony) {
          panel(f, l - 0.05 / bays, l + 0.05 / bays, slabBase, top - 1.2, 0.12, white);
          panel(f, r - 0.05 / bays, r + 0.05 / bays, slabBase, top - 1.2, 0.12, white);
        }
      }
      for (let j = 1; j < floors; j++) panel(f, 0, 1, slabBase + j * floor - 0.55, slabBase + j * floor + 0.35, 0.06, j % 4 ? brick : brickShade);
      panel(f, -0.005, 1.005, top - 1.2, top, 0.1, white);
      for (let j = 0; j < floors; j++) for (let k = 0; k < bays; k++) {
        if (litHash(seed, face0 + edge, j, k) > 0.3) continue;
        const y = slabBase + j * floor + 0.45;
        // Balcony bays light the recessed wall, so by day they keep the recess colour.
        panel(f, (k + 0.2) / bays, (k + 0.8) / bays, y, y + 2.0, 0.04, k % 3 === 1 ? recess : glass, true);
      }
    });
  };
  slab(north, northRoof, 0);
  slab(south, southRoof, 30);

  // Glass corner tower at the north end on 11th Street, framed in white: it fills the north face
  // and returns one bay down the west face, where a white fin rises past the roof.
  const northV = Math.min(...north.map(([, v]) => v));
  for (const f of faces(tidy(north)).filter(f => f.length > 6)) {
    const northFace = f.n[1] < -0.7, westFace = f.n[0] < -0.7;
    if (!northFace && !(westFace && Math.min(f.a[1], f.b[1]) < northV + 1)) continue;
    const aNorth = f.a[1] < f.b[1];
    const t0 = northFace || aNorth ? 0 : 1 - 7 / f.length;
    const t1 = northFace || !aNorth ? 1 : 7 / f.length;
    panel(f, t0, t1, slabBase, northRoof + 1, 0.15, cornerGlass);
    for (let y = slabBase + 3 * floor; y < northRoof; y += 3 * floor) panel(f, t0, t1, y - 0.2, y + 0.2, 0.2, white);
    // Rooms behind the glass corner, lit in front of it.
    const bays = Math.max(1, Math.round((t1 - t0) * f.length / 3.4));
    for (let j = 0; j * floor < northRoof - slabBase - 2; j++) for (let k = 0; k < bays; k++) {
      if (litHash(seed, 90 + (westFace ? 1 : 0), j, k) > 0.3) continue;
      const y = slabBase + j * floor + 0.4, w = (t1 - t0) / bays;
      panel(f, t0 + (k + 0.12) * w, t0 + (k + 0.88) * w, y, y + 2.2, 0.17, cornerGlass, true);
    }
    if (westFace) {
      // The fin stands on the West Peachtree sidewalk and rises past the roof.
      const t = aNorth ? t1 : t0, foot = at(f, t, 0, 0);
      panel(f, t - 0.6 / f.length, t + 0.6 / f.length, gradeAt(foot[0], foot[2]), pavilionTop + 2, 0.6, white);
    }
  }

  // Rooftop amenity pavilion: glass room under a brick parapet on the north slab (lidar 389.7 m
  // around x 452-460, z -3218 to -3238).
  const pavilion: P2[] = [[-5, -26], [3, -26], [3, -6], [-5, -6]];
  s.prism(pavilion, northRoof, pavilionTop - 0.8, '#aab6ba', roof);
  s.prism(pavilion, pavilionTop - 0.8, pavilionTop, brick, roof);
  for (const f of faces(pavilion)) panel(f, 0.05, 0.95, northRoof + 0.3, pavilionTop - 1.1, 0.03, '#aab6ba', true);

  return s.finish('#ffdcae', 0.62);
}
