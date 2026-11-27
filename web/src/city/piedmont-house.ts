import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * Piedmont House, 205 12th Street NE (Wood Partners, 2018): a 22-storey L-shaped apartment tower
 * of blue glass on a fine white grid, with stacked balconies, over a cream precast base and a
 * parking podium on its west side. The outline crosses the midtown-central / midtown-upper seam
 * at z = -3300: midtown-upper builds the whole building, moving its seam vertices out to the true
 * south face at z = -3295, and midtown-central draws two plain blocks inside those walls, which
 * stand in for its 5 m sliver while only that row is loaded. Heights are NAVD88 metres from the
 * April 2019 3DEP lidar: roof 358.2 m (about 77 m over the 281 m street), a central penthouse to 360.2 m, the podium at 302.5 m
 * (docs/log/ui/piedmont-house/README.md). City z grows to the south. Flat vertex colours, no library
 * surfaces: a painted body is a hooked material that costs its own draw and program.
 */
export const piedmontHouseId = 'osm:way:886024372';
const towerPart = 'osm:way:886024370';
const podiumPart = 'osm:way:886024369';
const origin: P2 = [1032, -3332];
const seamZ = -3300;
/** The building's south face, where the midtown-central sliver ends. */
const southZ = -3295;

const roofTop = 358.2,
  penthouseTop = 360.2,
  baseTop = 302.5,
  floors = 17;

// Glass from the provisional base-value table: base V >= 62 -> S <= 30.
const glass = '#9aaebc', // S 18%, V 74%
  white = '#ecebe6',
  cream = '#d9cfba',
  creamShade = '#c9bfa9',
  slab = '#f0efea',
  rail = '#aab7bd',
  garageBand = '#a8a296',
  roof = '#9a9892';

/**
 * The 5 m of the building that falls in midtown-central: two plain blocks tucked just inside the
 * walls midtown-upper draws, so they are hidden once that row is up and stand in for the slice
 * while only this one is.
 */
function southSliver(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, site.id, 'Piedmont House (south sliver)', [1031, -3297], [1, 0], [[-5, 0], [5, 0]]);
  if (!s) return null;
  const inset = .3, north = seamZ + inset, south = southZ - inset;
  // Corners run NW, NE, SE, SW. The north sides close the blocks while that half is not there
  // yet; the podium needs no east side against the tower.
  for (const [id, top, wall, sides] of [[towerPart, roofTop - .5, glass, [0, 1, 2, 3]], [podiumPart, baseTop - .5, cream, [0, 2, 3]]] as const) {
    const ring = site.parts?.find(q => q.id === id)?.rings[0];
    if (!ring) continue;
    const west = Math.min(...ring.map(([x]) => x)) + inset - 1031, east = Math.max(...ring.map(([x]) => x)) - inset - 1031;
    const z0 = north + 3297, z1 = south + 3297;
    const at = [[west, z0], [east, z0], [east, z1], [west, z1]];
    const point = (i: number, y: number) => [at[i % 4][0], y, at[i % 4][1]];
    for (const i of sides) s.body.quad(point(i, s.base), point(i, top), point(i + 1, top), point(i + 1, s.base), wall);
    s.body.quad(point(0, top), point(3, top), point(2, top), point(1, top), roof);
  }
  return s.finish('#f4d9a8', 0);
}

export function createPiedmontHouse(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const tower = site.parts?.find(p => p.id === towerPart);
  const podium = site.parts?.find(p => p.id === podiumPart);
  if (tower?.rings.length !== 1 || podium?.rings.length !== 1) return null;
  // The midtown-central clip lies wholly south of the seam.
  if (site.rings[0].every(([, z]) => z >= seamZ - 0.05)) return southSliver(buildings, site, grid);
  const s = landmarkShell(buildings, grid, site.id, 'Piedmont House', origin, [1, 0], [[8, 12], [8, -25]]);
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
  }).filter(f => f.length > 1);
  const at = (f: Face, t: number, y: number, depth: number) =>
    [f.a[0] + t * (f.b[0] - f.a[0]) + depth * f.n[0], y, f.a[1] + t * (f.b[1] - f.a[1]) + depth * f.n[1]];
  const panel = (f: Face, l: number, r: number, lo: number, hi: number, depth: number, color: string, lit = false) =>
    (lit ? s.lights : s.body).quad(at(f, l, lo, depth), at(f, l, hi, depth), at(f, r, hi, depth), at(f, r, lo, depth), color);
  const flat = (f: Face, l: number, r: number, y: number, d: number, color: string) =>
    s.body.quad(at(f, l, y, 0), at(f, l, y, d), at(f, r, y, d), at(f, r, y, 0), color);

  const extend = (ring: P2[]) => ring.map(([x, z]): P2 => [x, Math.abs(z - seamZ) < 0.05 ? southZ : z]);
  const towerPlan = local(extend(tower.rings[0]));
  const podiumPlan = local(extend(podium.rings[0]));
  const pitch = (roofTop - 1 - baseTop) / floors;

  // Parking podium on the west: cream precast with a darker band per level, skipped against the tower.
  s.prism(podiumPlan, s.base, baseTop, cream, roof);
  for (const f of faces(podiumPlan)) {
    const behind = at(f, 0.5, 0, 1);
    if (pointInRing(behind[0], behind[2], towerPlan)) continue;
    const mid = at(f, 0.5, 0, 0), y0 = gradeAt(mid[0], mid[2]);
    for (let y = y0 + 5.5; y < baseTop - 1.5; y += 3.4) panel(f, 0.02, 0.98, y, y + 1.2, 0.05, garageBand);
  }

  // Tower: cream precast base with tall windows, then the glass shaft.
  // The base has walls only: the shaft stands on it and would hide its roof.
  towerPlan.forEach(([x, z], i) => {
    const [a, b] = towerPlan[(i + 1) % towerPlan.length];
    s.body.quad([x, s.base, z], [x, baseTop, z], [a, baseTop, b], [a, s.base, b], cream);
  });
  s.prism(towerPlan, baseTop, roofTop, glass, roof);
  faces(towerPlan).forEach((f, face) => {
    const behind = at(f, 0.5, 0, 1);
    // Faces over the podium carry only the shaft above it.
    const overPodium = pointInRing(behind[0], behind[2], podiumPlan);
    const mid = at(f, 0.5, 0, 0), grade = gradeAt(mid[0], mid[2]);
    const bays = Math.max(1, Math.round(f.length / 3.2));
    if (!overPodium) {
    // Base: windows between precast piers, a precast band per floor (lobby double height).
    // Street-level lobby and retail glow at night; the floors above are dark parking and amenity.
    for (let k = 0; k < bays; k++) {
      panel(f, (k + 0.22) / bays, (k + 0.78) / bays, grade + 0.4, grade + 5.6, 0.04, glass, true);
      panel(f, (k + 0.22) / bays, (k + 0.78) / bays, grade + 5.6, baseTop - 2, 0.04, glass);
    }
    for (let y = grade + 6.5; y < baseTop - 2.5; y += 4) panel(f, 0, 1, y - 0.45, y + 0.45, 0.08, cream);
    }
    panel(f, -0.002, 1.002, baseTop - 1.2, baseTop, 0.12, creamShade);
    // Shaft: a white mullion per bay and a white slab edge per floor. Layers stand at least 4 cm
    // apart (closer ones z-fight at 400-600 m), 5 cm on the shaft, whose two long faces are mapped a
    // centimetre out of line: lit panes 5, slab edges 10, mullions 15, crown 20 cm.
    for (let k = 0; k <= bays; k++) {
      // Street View (March 2025): bold white corner columns and white mullions frame the glass.
      const w = (k === 0 || k === bays ? 0.9 : 0.22) / f.length;
      panel(f, k / bays - w, k / bays + w, baseTop, roofTop - 0.8, 0.15, white);
    }
    for (let j = 1; j < floors; j++) {
      const y = baseTop + j * pitch;
      panel(f, 0, 1, y - 0.4, y + 0.4, 0.1, white); // the white slab edge at every floor reads strongly in the photos
    }
    panel(f, -0.004, 1.004, roofTop - 0.8, roofTop, 0.2, white);
    // Balcony stacks at both ends of each face and at the middle of long faces.
    const stacks = f.length > 30 ? [0.1, 0.5, 0.9] : f.length > 12 ? [0.15, 0.85] : [];
    for (const c of stacks) {
      const half = 3.4 / f.length, l = Math.max(0.01, c - half), r = Math.min(0.99, c + half);
      for (let j = 1; j < floors; j++) {
        const y = baseTop + j * pitch;
        flat(f, l, r, y, 1.5, slab);
        panel(f, l, r, y, y + 1.0, 1.5, rail);
      }
    }
    // Residential rooms are noticeably lit at night (illustrative occupancy).
    for (let j = 0; j < floors; j++) for (let k = 0; k < bays; k++) {
      if (litHash(seed, face, j, k) > 0.3) continue;
      const y = baseTop + j * pitch;
      panel(f, (k + 0.1) / bays, (k + 0.9) / bays, y + 0.3, y + pitch - 0.3, 0.05, glass, true);
    }
  });

  // Central penthouse (lidar 360 m) where the two wings meet.
  const penthouse: P2[] = [[-4, -20], [12, -20], [12, -12], [-4, -12]];
  if (penthouse.every(([u, v]) => pointInRing(u, v, towerPlan))) {
    s.prism(penthouse, roofTop, penthouseTop, white, roof);
  }

  const model = s.finish('#ffdcae', 0.62);
  // This row's outline is clipped at the board seam (z = -3300); the tower's south 5 m and its
  // balconies stand on the midtown-central clip's outline, so the footprint audit allows 7 m here.
  model.group.userData.footprint = { maxProjection: 7 };
  return model;
}
