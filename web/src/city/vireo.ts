import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * Vireo Piedmont Park, 195 13th Street NE (2020, Smallwood): a white 26-storey apartment tower with
 * deep stacked balconies on its long faces, over a garage podium on its south side. Heights are
 * NAVD88 metres from the April 2019 3DEP lidar, which disagrees with the mapped 105 m: the
 * occupied roof is 368.4 m and the top amenity floor 375.8 m over a 286.9 m street (about 82 and
 * 89 m), with the podium at 316.5 m (docs/log/ui/vireo/README.md). City z grows to the south.
 * Flat vertex colours, no library surfaces.
 */
export const vireoId = 'osm:way:796360049';
const towerPart = 'osm:way:796360050';
const podiumPart = 'osm:way:886021359';
const origin: P2 = [985, -3470];

const podiumTop = 316.5,
  roofTop = 368.4,
  amenityTop = 375.8,
  loungeTop = 373.5,
  floors = 17;

// Near-neutral glass, from the provisional base-value table (base V ≥ 62 → S ≤ 30).
const white = '#e7e6e1',
  whiteShade = '#d9d8d2',
  slab = '#f1f0eb',
  rail = '#b8c4c6',
  glass = '#9eb0b4', // S 12%, V 71%
  garage = '#c9c8c2',
  garageBand = '#a7a9a8',
  wood = '#8a5d40',
  roof = '#9a9892';

export function createVireo(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const tower = site.parts?.find(p => p.id === towerPart);
  const podium = site.parts?.find(p => p.id === podiumPart);
  if (tower?.rings.length !== 1 || podium?.rings.length !== 1) return null;
  const s = landmarkShell(buildings, grid, site.id, 'Vireo Piedmont Park', origin, [1, 0], [[0, 0], [-20, -5], [20, -5]]);
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
  const flat = (f: Face, l: number, r: number, y: number, d0: number, d1: number, color: string) =>
    s.body.quad(at(f, l, y, d0), at(f, l, y, d1), at(f, r, y, d1), at(f, r, y, d0), color);

  const towerPlan = local(tower.rings[0]);
  const podiumPlan = local(podium.rings[0]);
  const pitch = (roofTop - podiumTop) / floors;

  // Garage podium: pale precast with a darker opening band per parking level.
  s.prism(podiumPlan, s.base, podiumTop, garage, roof);
  for (const f of faces(podiumPlan)) {
    const mid = at(f, 0.5, 0, 0), behind = at(f, 0.5, 0, 1);
    if (pointInRing(behind[0], behind[2], towerPlan)) continue;
    const y0 = gradeAt(mid[0], mid[2]);
    for (let y = y0 + 6; y < podiumTop - 1.5; y += 3.9) panel(f, 0.02, 0.98, y, y + 1.4, 0.05, garageBand);
  }

  // Tower: white walls to the occupied roof.
  s.prism(towerPlan, s.base, roofTop, white, roof);
  faces(towerPlan).forEach((f, face) => {
    const behind = at(f, 0.5, 0, 1);
    const mid = at(f, 0.5, 0, 0), grade = gradeAt(mid[0], mid[2]);
    // Floors below the podium line are lobby and parking on every face: garage bands, no rooms.
    const lo = podiumTop;
    if (!pointInRing(behind[0], behind[2], podiumPlan)) {
      for (let y = grade + 6; y < podiumTop - 1.5; y += 3.9) panel(f, 0.01, 0.99, y, y + 1.4, 0.05, garageBand);
    }
    // Long faces run east–west (north and south); classify by direction, so short collinear
    // pieces of a long face still get balconies.
    const long = Math.abs(f.n[1]) > 0.7;
    const bays = Math.max(2, Math.round(f.length / (long ? 5 : 3.4)));
    if (long) {
      // Long faces: glass behind deep balconies on every floor, with white piers between bays.
      panel(f, 0.01, 0.99, lo, roofTop - 1, 0.03, glass);
      for (let k = 0; k <= bays; k++) panel(f, k / bays - 0.35 / f.length, k / bays + 0.35 / f.length, lo, roofTop - 0.6, 0.08, whiteShade);
      for (let y = podiumTop + pitch; y < roofTop - 1; y += pitch) {
        if (y < lo + 0.5) continue;
        flat(f, 0.03, 0.97, y, 0, 1.9, slab);
        panel(f, 0.03, 0.97, y - 0.32, y, 1.9, slab);
        panel(f, 0.03, 0.97, y, y + 1.05, 1.88, rail);
      }
    } else {
      // End walls: white with a punched window column per bay and a band per floor.
      for (let k = 0; k < bays; k++) panel(f, (k + 0.25) / bays, (k + 0.75) / bays, lo, roofTop - 1.2, 0.03, glass);
      for (let y = podiumTop + pitch; y < roofTop - 1; y += pitch) if (y > lo) panel(f, 0, 1, y - 0.5, y + 0.45, 0.06, white);
    }
    // Residential rooms are noticeably lit at night (illustrative occupancy).
    for (let j = 0, y = podiumTop; j < floors; j++, y += pitch) {
      if (y < lo - 0.5) continue;
      for (let k = 0; k < bays; k++) {
        // Deep balconies hide much of a lit room from above, so the long faces light more of them.
        if (litHash(seed, face, j, k) > (long ? 0.42 : 0.3)) continue;
        const l = long ? (k + 0.08) / bays : (k + 0.27) / bays, r = long ? (k + 0.92) / bays : (k + 0.73) / bays;
        panel(f, l, r, y + 0.15, y + pitch - 0.35, long ? 0.05 : 0.07, glass, true);
        // The room light also shows through the balcony's glass rail, which is what reads from above.
        if (long && y + pitch < roofTop - 1) panel(f, l, r, y + pitch, y + pitch + 1.05, 1.9, rail, true);
      }
    }
    panel(f, -0.003, 1.003, roofTop - 1, roofTop, 0.1, white);
  });

  // Top floor: the amenity level across the north half and a lounge on the east middle, with the
  // pool deck and its glass rail on the open south strip (lidar 375.8, 373.5 and 368.4 m).
  // Plans in (u, v) = (x - 985, z + 3470), counter-clockwise; the north half is v < 0.
  const amenity: P2[] = [[-26, -21.8], [26, -21.8], [26, -5], [-26, -5]];
  const lounge: P2[] = [[5, -5], [26, -5], [26, 5], [5, 5]];
  s.prism(amenity, roofTop, amenityTop, glass, roof);
  s.prism(lounge, roofTop, loungeTop, glass, roof);
  for (const plan of [amenity, lounge]) {
    for (const f of faces(plan)) {
      panel(f, 0, 1, (plan === amenity ? amenityTop : loungeTop) - 0.8, plan === amenity ? amenityTop : loungeTop, 0.06, white);
      panel(f, 0.04, 0.96, roofTop + 0.4, (plan === amenity ? amenityTop : loungeTop) - 1.2, 0.04, glass, true);
    }
  }
  for (const f of faces(towerPlan)) panel(f, 0, 1, roofTop, roofTop + 1.1, -0.15, rail);

  // Wood-clad entrance porch on 13th Street (the north face), reaching toward the sidewalk.
  const north = faces(towerPlan).filter(f => f.n[1] < -0.7).reduce((a, b) => (b.length > a.length ? b : a));
  const mid = at(north, 0.5, 0, 0), y0 = gradeAt(mid[0], mid[2]);
  flat(north, 0.25, 0.75, y0 + 5, 0, 5.5, wood);
  panel(north, 0.25, 0.75, y0 + 4.2, y0 + 5, 5.5, wood);
  panel(north, 0.08, 0.92, y0 + 0.3, y0 + 4.5, 0.06, glass, true);
  return s.finish('#ffdcae', 0.62);
}
