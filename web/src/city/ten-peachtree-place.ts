import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';
import { wallRuns } from './marquis-offices';

/**
 * Southern Company Gas at Ten Peachtree Place (1991), red granite with punched window rows,
 * green-glass corner slots, a glazed central bay under a castellated crown and an arched lunette
 * over the Peachtree Place entrance. Heights are NAVD88 metres from the USGS GA_Statewide_B2_2018
 * lidar (docs/log/ui/ten-peachtree-place/README.md).
 */
export const tenPeachtreePlaceId = 'osm:way:164876035';
const TOWER = 'osm:way:1430435514', SOUTH_WING = 'osm:way:235008477';
const origin: P2 = [411, -3010];

export const TEN_PEACHTREE_PLACE = {
  grade: 293.1, roof: 374.4, parapet: 376.1, penthouse: 378.0, lowMid: 320.2, lowSouth: 311.8, floor: 3.9,
} as const;

// Red granite (photographs), dark window rows and green glass under the base-value table.
const granite = '#ad8a7e', graniteDark = '#8e7066', windows = '#606c70', green = '#7a9a92', roof = '#9c948a',
  lobby = '#4f5d60';

export function createTenPeachtreePlace(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const parts = site.parts ?? [];
  const tower = parts.find(p => p.id === TOWER);
  if (!tower) return null;
  const s = landmarkShell(buildings, grid, site.id, 'Ten Peachtree Place', origin, [1, 0], [[0, 0], [-20, 8], [20, -8]]);
  if (!s) return null;
  const H = TEN_PEACHTREE_PLACE, seed = seedOf(tenPeachtreePlaceId), base = s.base;
  const local = (ring: P2[]): P2[] => {
    const plan = ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]);
    const area = plan.reduce((sum, [x, z], i) => sum + x * plan[(i + 1) % plan.length][1] - plan[(i + 1) % plan.length][0] * z, 0);
    return area < 0 ? plan.reverse() : plan;
  };
  type Face = { a: P2; b: P2; length: number; n: P2 };
  const faces = (plan: P2[]): Face[] => plan.map((a, i) => {
    const b = plan[(i + 1) % plan.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { a, b, length, n: [(b[1] - a[1]) / length, -(b[0] - a[0]) / length] as P2 };
  }).filter(f => f.length > 0.5);
  const at = (f: Face, t: number, y: number, d: number) =>
    [f.a[0] + t * (f.b[0] - f.a[0]) + d * f.n[0], y, f.a[1] + t * (f.b[1] - f.a[1]) + d * f.n[1]];
  const panel = (f: Face, l: number, r: number, lo: number, hi: number, d: number, colour: string, lit = false) =>
    (lit ? s.lights : s.body).quad(at(f, l, lo, d), at(f, l, hi, d), at(f, r, hi, d), at(f, r, lo, d), colour);

  // Low wings to the south: granite with one window row per floor.
  for (const part of parts) {
    if (part === tower || part.h < 8) continue;
    const plan = local(part.rings[0]);
    // Lidar: the south wing on 10th tops out at 311.8 m, the middle wings at 320.2 m.
    const top = part.id === SOUTH_WING ? H.lowSouth : H.lowMid;
    s.prism(plan, base, top, granite, roof);
    for (const f of faces(plan)) {
      if (f.length < 6 || f.n[1] < 0.5) continue; // south and street faces only
      for (let y = H.grade + 4.6; y + 3 < top; y += H.floor) panel(f, 0.06, 0.94, y + 1, y + 2.8, 0.05, windows);
    }
  }

  // Tower: granite to the roof, a parapet with a castellated crown, and a penthouse.
  const plan = local(tower.rings[0]);
  s.prism(plan, base, H.roof, granite, roof);
  const floors = Math.floor((H.roof - 8 - (H.grade + 8)) / H.floor);
  // Mapping nodes split the long elevations; lay details out on whole collinear runs.
  const runs: Face[] = wallRuns(plan).map(([a, b]) => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { a, b, length, n: [(b[1] - a[1]) / length, -(b[0] - a[0]) / length] as P2 };
  });
  runs.forEach((f, face) => {
    if (f.length < 8) return;
    const broad = f.length > 40, north = f.n[1] < -0.9;
    const lo = H.grade + 8;
    // Window rows: one dark band per floor, broken by the corner slots and the central bay.
    const slot = 4.5 / f.length, slotW = 1.6 / f.length;
    const bay = broad ? 0.16 : 0;
    for (let j = 0; j < floors; j++) {
      const y = lo + j * H.floor;
      const top = j >= floors - 7 && broad;
      const spans: [number, number][] = top
        ? [[0.04, slot - slotW], [slot + slotW, 0.5 - bay], [0.5 + bay, 1 - slot - slotW], [1 - slot + slotW, 0.96]]
        : [[0.04, slot - slotW], [slot + slotW, 1 - slot - slotW], [1 - slot + slotW, 0.96]];
      spans.forEach(([l, r], k) => {
        panel(f, l, r, y + 1.1, y + 2.9, 0.05, windows);
        // Offices are mostly dark by 23:30: about 6% of the 3 m window bays stay lit.
        const bays = Math.max(1, Math.round(((r - l) * f.length) / 3));
        for (let b = 0; b < bays; b++) {
          if (litHash(seed, face * 8 + k, j, b) >= 0.06) continue;
          const bl = l + ((r - l) * b) / bays, br = l + ((r - l) * (b + 1)) / bays;
          panel(f, bl + 0.2 / f.length, br - 0.2 / f.length, y + 1.1, y + 2.9, 0.06, windows, true);
        }
      });
    }
    // Green-glass slots near each corner, full height of the shaft.
    for (const t of [slot, 1 - slot]) panel(f, t - slotW, t + slotW, lo, H.roof - 6, 0.04, green);
    // The glazed central bay through the top seven floors of the broad faces.
    if (broad) panel(f, 0.5 - bay, 0.5 + bay, lo + (floors - 7) * H.floor, H.roof - 5, 0.04, green);
    // Setback ledge over the base and the cornice under the crown.
    panel(f, -0.01, 1.01, H.grade + 27, H.grade + 28.2, 0.45, graniteDark);
    panel(f, -0.01, 1.01, H.roof - 5.6, H.roof - 4.6, 0.5, graniteDark);
    // Castellated crown: dark openings between granite merlons above the cornice.
    const merlons = Math.max(2, Math.round(f.length / 3.2));
    for (let k = 0; k < merlons; k++) {
      if (k % 2 === 0) continue;
      panel(f, k / merlons, (k + 1) / merlons, H.roof - 3.8, H.roof - 0.8, 0.04, graniteDark);
    }
    panel(f, 0, 1, H.roof, H.parapet, 0, granite);
    if (north && broad) {
      // The Peachtree Place entrance: a tall recessed glass bay with a lunette over the setback.
      panel(f, 0.44, 0.56, H.grade + 0.3, H.grade + 14, 0.06, lobby);
      s.lights.quad(at(f, 0.46, H.grade + 0.3, 0.07), at(f, 0.46, H.grade + 5, 0.07), at(f, 0.54, H.grade + 5, 0.07), at(f, 0.54, H.grade + 0.3, 0.07), lobby);
      const cy = H.grade + 28.2, r = 4.2, mid = 0.5;
      for (let k = 0; k < 6; k++) {
        const a0 = (k / 6) * Math.PI, a1 = ((k + 1) / 6) * Math.PI;
        const p = (a: number, rr: number) => at(f, mid + (Math.cos(a) * rr) / f.length, cy + Math.sin(a) * rr, 0.06);
        s.body.quad(p(a0, r), p(a0, r + 0.9), p(a1, r + 0.9), p(a1, r), graniteDark);
        s.body.tri(p(a0, 0), p(a0, r), p(a1, r), green);
      }
    }
  });
  // Rooftop penthouse at the lidar's 378 m, set back over the middle.
  s.prism([[-9, -6], [9, -6], [9, 6], [-9, 6]], H.roof, H.penthouse, granite, roof);
  return s.finish('#f2e2c0', 0.5);
}
