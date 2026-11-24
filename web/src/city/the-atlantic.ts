import { Mesh } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

/**
 * The Atlantic, the 46-storey Art Deco revival apartment tower at 1380 Atlantic Drive.
 * The mapped outline crosses the midtown-upper / brookwood-south seam at z = -4100: the
 * brookwood-south clip holds the tower, and the midtown-upper clip holds the parking podium
 * plus a 3 m sliver of the tower's south face. Each clip claims its own copy of the site, so
 * neither row keeps a generic box. Heights are NAVD88 metres from the April 2019 3DEP lidar
 * (docs/log/ui/the-atlantic/README.md).
 */
export const atlanticId = 'osm:way:269542078';
const towerPart = 'osm:way:884897812';
const podiumPart = 'osm:way:884897816';
const seamZ = -4100;
/** The tower's south face, where the midtown-upper sliver ends (lidar and mapped part agree). */
const towerSouthZ = -4097;

const towerOrigin: P2 = [-547.2, -4112.3];
const podiumOrigin: P2 = [-562, -4077];

const stone = '#cdbf9f',
  pier = '#c9b796',
  pierShade = '#b9a685',
  glass = '#5b6e84',
  rail = '#7f8e99',
  screen = '#857b6a',
  crown = '#d2c19c',
  roof = '#8f8b82',
  deck = '#c6b99c',
  opening = '#3b3d3e';

/** Heights in NAVD88 metres. */
const stoneTop = 290.5,
  shaftTop = 398,
  occupiedRoof = 431,
  screenTop = 440.5,
  spireTop = 445.3,
  floor = 3.25;

/** Moves vertices on the board seam out to the face they stand in for. */
export function extendAcrossSeam(ring: P2[], seam: number, to: number): P2[] {
  return ring.map(([x, z]) => (Math.abs(z - seam) < 0.05 ? [x, to] : [x, z]));
}

/** Counter-clockwise in (u, v), so each edge's outward normal is (dv, -du) / length. */
function local(ring: P2[], origin: P2): P2[] {
  const plan = ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]);
  const area = plan.reduce((sum, [x, z], i) => {
    const [nx, nz] = plan[(i + 1) % plan.length];
    return sum + x * nz - nx * z;
  }, 0);
  return area < 0 ? plan.reverse() : plan;
}

/** Drops vertices that only split a straight wall (mapped outlines carry several). */
export function mergeCollinear(ring: P2[], tolerance = 0.03): P2[] {
  const plan = ring.filter((p, i) => {
    const next = ring[(i + 1) % ring.length];
    return Math.hypot(next[0] - p[0], next[1] - p[1]) > 1e-6;
  });
  const out = plan.filter((p, i) => {
    const a = plan[(i + plan.length - 1) % plan.length], b = plan[(i + 1) % plan.length];
    const ux = p[0] - a[0], uz = p[1] - a[1], vx = b[0] - p[0], vz = b[1] - p[1];
    const lu = Math.hypot(ux, uz), lv = Math.hypot(vx, vz);
    return Math.abs(ux * vz - uz * vx) / (lu * lv) > tolerance || ux * vx + uz * vz < 0;
  });
  return out.length >= 3 ? out : plan;
}

type Rect = [u0: number, u1: number, v0: number, v1: number];
export const rect = ([u0, u1, v0, v1]: Rect): P2[] => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

/** The union of a wide rectangle `a` and a deep one `b`, counter-clockwise. */
function cross(a: Rect, b: Rect): P2[] {
  return [
    [b[0], b[2]], [b[1], b[2]], [b[1], a[2]], [a[1], a[2]], [a[1], a[3]], [b[1], a[3]],
    [b[1], b[3]], [b[0], b[3]], [b[0], a[3]], [a[0], a[3]], [a[0], a[2]], [b[0], a[2]],
  ];
}

/**
 * Set-backs over the mapped shaft, each inside the one below (local u, v; v points south).
 * Lidar puts 431 m across the middle of every face and 392–418 m in the last few metres of
 * each corner; the long faces keep their central bays to the top.
 */
const deep: Rect = [-21, 22, -15, 15.3];
export const tiers: { plan: P2[]; lo: number; hi: number }[] = [
  { plan: cross([-30.5, 29.6, -13.2, 14.8], deep), lo: 398, hi: 410 },
  { plan: cross([-28, 27.5, -11.5, 13], deep), lo: 410, hi: 420 },
  { plan: cross([-26, 25, -10, 11], deep), lo: 420, hi: 431 },
];
/** The open crown screen sits inside the top tier. */
export const screenRect: Rect = [-24, 23, -10, 11];

/** Stable per-window hash in [0, 1). */
function hash(a: number, b: number, c: number) {
  const h = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

export function createAtlantic(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const tower = site.parts?.find(part => part.id === towerPart);
  const podium = site.parts?.find(part => part.id === podiumPart);
  if (podium?.rings.length === 1) return createPodium(buildings, site, podium.rings[0], grid);
  if (tower?.rings.length === 1 && tower.rings[0].length > 8) return createTower(buildings, site, tower.rings[0], grid);
  return null;
}

function createTower(buildings: VBuilding[], site: VBuilding, towerRing: P2[], grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, site.id, 'The Atlantic', towerOrigin, [1, 0], [[0, 0], [-25, 0], [25, 0]]);
  if (!s) return null;
  const ring = mergeCollinear(local(extendAcrossSeam(towerRing, seamZ, towerSouthZ), towerOrigin));
  const hu = Math.max(...ring.map(([u]) => u));

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
  /** A slab standing proud of the face: front plus both returns. */
  const fin = (f: Face, l: number, r: number, lo: number, hi: number, depth: number, color: string, side: string) => {
    panel(f, l, r, lo, hi, depth, color);
    s.body.quad(at(f, l, lo, 0), at(f, l, hi, 0), at(f, l, hi, depth), at(f, l, lo, depth), side);
    s.body.quad(at(f, r, lo, depth), at(f, r, hi, depth), at(f, r, hi, 0), at(f, r, lo, 0), side);
  };

  // Stone base, then the glass shaft between full-height precast piers.
  s.prism(ring, s.base, stoneTop, stone, roof);
  s.prism(ring, stoneTop, shaftTop, glass, roof);
  // Three set-backs cut the corners back, so every face climbs in steps to the screen.
  for (const { plan, lo, hi } of tiers) s.prism(plan, lo, hi, glass, roof);

  const bay = 4.2;
  const piers = (plan: P2[], lo: number, hi: number, proud: boolean, edge0: number) => {
    faces(plan).forEach((f, edge) => {
      const bays = Math.max(1, Math.round(f.length / bay));
      const half = 0.75 / f.length;
      for (let k = 0; k <= bays; k++) {
        const t = k / bays;
        const l = Math.max(0, t - half), r = Math.min(1, t + half);
        if (proud) fin(f, l, r, lo, hi, 0.35, pier, pierShade);
        else panel(f, l, r, lo, hi, 0.12, pier); // flush enough to touch the wall (no returns)
      }
      // Long faces carry stacked balconies in alternate bays; the ends carry one each side.
      const long = f.length > 40, end = f.length > 15 && !long;
      if (proud && (long || end)) {
        for (let k = 1; k < bays - 1; k++) {
          if (long ? k % 2 === 0 : k !== 1 && k !== bays - 2) continue;
          fin(f, (k + 0.18) / bays, (k + 0.82) / bays, stoneTop, hi - 2.5, 1.2, rail, pierShade);
        }
      }
      // Residential windows are noticeably lit at night (illustrative occupancy).
      const floors = Math.floor((hi - lo - 0.6) / floor);
      for (let j = 0; j < floors; j++) for (let k = 0; k < bays; k++) {
        if (hash(edge0 + edge, j + lo, k) > 0.16) continue;
        const balcony = proud && (long ? k % 2 === 1 && k < bays - 1 : end && (k === 1 || k === bays - 2));
        const y = lo + 0.4 + j * floor;
        panel(f, (k + 0.2) / bays, (k + 0.8) / bays, y, y + 2.5, balcony ? 1.25 : 0.07, balcony ? rail : glass, true);
      }
    });
  };
  piers(ring, stoneTop, shaftTop, true, 0);
  tiers.forEach(({ plan, lo, hi }, i) => piers(plan, lo, hi, false, 40 + 20 * i));

  // Lobby: tall warm windows in the stone base, with the arrival canopy on the east drive.
  const grade = (u: number, v: number) => grid.sample(u + towerOrigin[0], v + towerOrigin[1]) ?? s.base;
  for (const f of faces(ring)) {
    if (f.length < 15 || f.n[1] > 0.5) continue; // The south face meets the garage.
    const mid = at(f, 0.5, 0, 0);
    const y0 = grade(mid[0], mid[2]) + 0.3;
    const count = f.length > 40 ? 5 : 3;
    for (let k = 0; k < count; k++) {
      const t = (k + 0.5) / count;
      panel(f, t - 1.4 / f.length, t + 1.4 / f.length, y0, Math.min(y0 + 9, stoneTop - 1.5), 0.07, glass, true);
    }
  }
  const eastGrade = grade(hu, 0);
  s.body.box(4.5, 0.6, 12, hu + 2.25, eastGrade + 5.2, 0, pierShade);
  for (const v of [-5.6, 5.6]) s.body.box(0.4, 5, 0.4, hu + 4.2, eastGrade + 2.5, v, pier);

  // Crown: a dark screen box behind tan ribs with X lattice, stepped at the occupied roof and
  // crowned by corner pinnacles. Ribs, lattice and pinnacles are floodlit as one warm glow.
  const crownPlan = rect(screenRect);
  // The screen is open above: lidar finds a lower roof and penthouse (~434 m) inside it.
  s.prism(rect([-14, 14, -6, 6]), occupiedRoof, 434.5, '#a39d90', roof);
  for (const f of faces(crownPlan)) {
    panel(f, 0, 1, occupiedRoof, screenTop, 0, screen);
    const bays = Math.max(2, Math.round(f.length / 4.5));
    for (let k = 0; k <= bays; k++) {
      const t = k / bays, w = 0.5 / f.length;
      panel(f, t - w, t + w, occupiedRoof, screenTop + 1.5, 0.3, crown, true);
    }
    for (let k = 0; k < bays; k++) {
      const l = k / bays, r = (k + 1) / bays, d = 0.25, w = 0.35 / f.length;
      s.lights.quad(at(f, l + w, occupiedRoof + 1, d), at(f, l - w, occupiedRoof + 1.9, d),
        at(f, r - w, screenTop - 0.5, d), at(f, r + w, screenTop - 1.4, d), crown);
      s.lights.quad(at(f, r - w, occupiedRoof + 1, d), at(f, r + w, occupiedRoof + 1.9, d),
        at(f, l + w, screenTop - 0.5, d), at(f, l - w, screenTop - 1.4, d), crown);
    }
    panel(f, 0, 1, screenTop - 0.8, screenTop, 0.32, crown, true);
  }
  // Corner pinnacles stand just inside the screen's corners, smaller ones at the long-face thirds.
  const [u0, u1, v0, v1] = screenRect;
  const pinnacles = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => [u - Math.sign(u) * 1.3, v - Math.sign(v) * 1.3, 1.3])
    .concat([-8, 7].flatMap(u => [[u, v0 + 0.9, 0.9], [u, v1 - 0.9, 0.9]]));
  for (const [u, v, r] of pinnacles) {
    const top = r > 1 ? spireTop : spireTop - 2.5;
    const sq: P2[] = [[u - r, v - r], [u + r, v - r], [u + r, v + r], [u - r, v + r]];
    sq.forEach(([x, z], i) => {
      const [nx, nz] = sq[(i + 1) % 4];
      s.lights.quad([x, occupiedRoof, z], [x, screenTop + 1, z], [nx, screenTop + 1, nz], [nx, occupiedRoof, nz], crown);
      s.lights.tri([x, screenTop + 1, z], [nx, screenTop + 1, nz], [u, top, v], crown);
    });
  }
  return s.finish('#ffd49a', 0.62);
}

function createPodium(buildings: VBuilding[], site: VBuilding, podiumRing: P2[], grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, site.id, 'The Atlantic podium', podiumOrigin, [1, 0], [[0, 0], [-35, 0], [35, 0]]);
  if (!s) return null;
  // The tower-side edge crosses the tower's south face; keep it 0.1 m clear on the podium side.
  const clear = towerSouthZ + 0.1;
  const ring = mergeCollinear(local(podiumRing.map(([x, z]): P2 => Math.abs(z - towerSouthZ) < 0.5 ? [x, clear] : [x, z]), podiumOrigin));
  const top = 288.6;
  s.prism(ring, s.base, top, deck, '#9d978a');
  const grade = (u: number, v: number) => grid.sample(u + podiumOrigin[0], v + podiumOrigin[1]);
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 4 || (a[1] === b[1] && a[1] === clear - podiumOrigin[1])) return;
    const n: P2 = [(b[1] - a[1]) / length, -(b[0] - a[0]) / length];
    const at = (t: number, y: number, depth: number) =>
      [a[0] + t * (b[0] - a[0]) + depth * n[0], y, a[1] + t * (b[1] - a[1]) + depth * n[1]];
    const ga = grade(...a), gb = grade(...b);
    if (ga === null || gb === null) return;
    // Open parking decks: one dark opening band per level above the higher end of the face.
    for (let y = Math.max(ga, gb) + 1.4; y + 2.6 < top - 0.6; y += 3.2) {
      s.body.quad(at(0.01, y, 0.05), at(0.01, y + 1.9, 0.05), at(0.99, y + 1.9, 0.05), at(0.99, y, 0.05), opening);
    }
    // Precast columns cross the openings.
    const columns = Math.max(1, Math.round(length / 9));
    for (let k = 1; k < columns; k++) {
      const t = k / columns, w = 0.45 / length;
      s.body.quad(at(t - w, Math.min(ga, gb), 0.1), at(t - w, top, 0.1), at(t + w, top, 0.1), at(t + w, Math.min(ga, gb), 0.1), deck);
    }
  });
  // Amenity deck against the tower: planters and a parapet.
  for (const [u, w] of [[-30, 10], [-8, 14], [16, 12], [36, 8]]) s.body.box(w, 1, 2.4, u, top + 0.5, -16.5, '#7d8a63');
  const model = s.finish();
  // The podium has no lit panes, and an empty lamp mesh still costs a draw call.
  for (const child of model.group.children) {
    if (child instanceof Mesh && !child.geometry.getAttribute('position').count) child.visible = false;
  }
  return model;
}
