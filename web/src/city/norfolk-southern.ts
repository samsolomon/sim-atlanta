import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * Norfolk Southern headquarters, 650 West Peachtree (2021): a tall and a short glass office tower
 * on a five-level podium, joined by a glass hub. OSM maps the towers as roof slabs at levels 20
 * and 13 over thin end masses; the 2019 lidar predates the building. HOK gives 17- and 10-storey
 * towers over a 5-storey podium (22 and 15 floors). Heights are therefore INFERRED: OSM's level
 * counts are shifted up two levels to HOK's totals, with 3.6 m podium levels (OSM's 18 m podium)
 * and 4.0 m office floors. Each tower is two knife-edged glass halves either side of a slightly
 * lower slot, with lower end shoulders, as OSM's parts describe; each is a straight prism from grade
 * (any lean or overhang at the base is not modelled). The glass hub reaches the street lobby, as the
 * photographs show, though OSM maps only its roof (docs/log/ui/norfolk-southern/README.md).
 * Flat vertex colours, no library surfaces: library curtain glass is a hooked material that costs its
 * own low-tier draw and program.
 */
export const norfolkSouthernId = 'osm:way:1344630139';
const origin: P2 = [322, -2140];

/** OSM part id → role. Tower heights are OSM metres, mapped through `inferred`. */
export const roles: Record<string, 'tall' | 'slot' | 'shoulder' | 'hub' | 'pavilion' | 'canopy'> = {
  'osm:way:1344630135': 'tall', 'osm:way:1344630136': 'tall', 'osm:way:1344630134': 'slot',
  'osm:way:1344630137': 'shoulder', 'osm:way:1344870482': 'shoulder',
  'osm:way:1344630132': 'tall', 'osm:way:1344630133': 'tall', 'osm:way:1344630131': 'slot',
  'osm:way:1344630138': 'shoulder', 'osm:way:1344870481': 'shoulder',
  'osm:way:1344630130': 'hub', 'osm:way:1344630129': 'pavilion',
  'osm:way:1344630127': 'canopy', 'osm:way:1344630128': 'canopy',
};

const podiumTop = 18,
  officeFloor = 4.0;
/** OSM height (3.6 m per level) → HOK floor count (two more levels) → metres over grade. */
export function inferred(osmH: number) {
  const level = osmH / 3.6 + 2;
  return podiumTop + (level - 5) * officeFloor;
}

// Glass picked from the provisional base-value table (base V ≥ 62 → S ≤ 30, V 50–60 → S ≤ 22).
const glass = '#90a4b5', // S 20%, V 71%: the reflective blue curtain wall
  band = '#7d848b', // S 10%, V 55%: floor-line spandrels
  slotGlass = '#73777b', // S 6%, V 48%: the dark recess between the halves
  podiumGlass = '#83909a', // S 15%, V 60%
  hubGlass = '#8e9ba4',
  canopy = '#d5d2cb',
  roof = '#8d8f90';

export function createNorfolkSouthern(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  // A tall part this skin doesn't know (an OSM re-map) falls back to the generic renderer.
  if (!site.parts?.length || site.parts.some(p => p.h > 20 && !roles[p.id])) return null;
  const s = landmarkShell(buildings, grid, site.id, 'Norfolk Southern headquarters', origin, [1, 0], [[0, 0]]);
  if (!s) return null;
  const seed = seedOf(site.id);
  const datum = s.base + 0.35;
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
  }).filter(f => f.length > 0.6);
  const at = (f: Face, t: number, y: number, depth: number) =>
    [f.a[0] + t * (f.b[0] - f.a[0]) + depth * f.n[0], y, f.a[1] + t * (f.b[1] - f.a[1]) + depth * f.n[1]];
  const panel = (f: Face, l: number, r: number, lo: number, hi: number, depth: number, color: string, lit = false) =>
    (lit ? s.lights : s.body).quad(at(f, l, lo, depth), at(f, l, hi, depth), at(f, r, hi, depth), at(f, r, lo, depth), color);

  type Mass = { plan: P2[]; top: number; role: string };
  const masses: Mass[] = [];
  for (const part of site.parts) {
    if (part.rings.length !== 1) continue;
    const role = roles[part.id] ?? (part.h <= 20 ? 'podium' : null);
    if (!role) continue;
    const top = role === 'tall' || role === 'slot' || role === 'shoulder' ? inferred(part.h) : part.h;
    masses.push({ plan: local(part.rings[0]), top: datum + top, role });
  }
  /** The height a face's outside is covered to by another mass. */
  const coveredTo = (f: Face, self: Mass) => {
    const p = at(f, 0.5, 0, 0.4);
    return Math.max(datum, ...masses.filter(m => m !== self && m.role !== 'canopy' && pointInRing(p[0], p[2], m.plan)).map(m => m.top));
  };

  let face = 0;
  for (const m of masses) {
    if (m.role === 'canopy') {
      const [cu, cv] = m.plan.reduce(([a, b], [u, v]) => [a + u / m.plan.length, b + v / m.plan.length], [0, 0]);
      // OSM's canopies sit under the towers' roof outlines, which City extrudes to grade.
      if (masses.some(o => o !== m && o.role !== 'canopy' && pointInRing(cu, cv, o.plan))) continue;
      const y = gradeAt(cu, cv) + m.top - datum;
      s.prism(m.plan, y - 0.6, y, canopy, canopy);
      continue;
    }
    const tower = m.role === 'tall' || m.role === 'slot' || m.role === 'shoulder';
    const wall = m.role === 'slot' ? slotGlass : tower ? glass : m.role === 'podium' ? podiumGlass : hubGlass;
    s.prism(m.plan, s.base, m.top, wall, roof);
    for (const f of faces(m.plan)) {
      face++;
      const from = coveredTo(f, m);
      if (from >= m.top - 0.5 || f.length < 2) continue;
      if (tower) {
        // A spandrel line per office floor above the podium; lit offices are sparse at night.
        for (let y = datum + podiumTop + officeFloor; y < m.top - 1; y += officeFloor) {
          if (y - 0.3 < from) continue;
          panel(f, 0, 1, y - 0.35, y + 0.35, 0.04, band);
        }
        const bays = Math.max(1, Math.round(f.length / 6));
        for (let j = 0, y = datum + podiumTop; y + officeFloor < m.top; j++, y += officeFloor) {
          if (y < from) continue;
          for (let k = 0; k < bays; k++) {
            if (litHash(seed, face, j, k) > 0.08) continue;
            panel(f, (k + 0.08) / bays, (k + 0.92) / bays, y + 0.5, y + officeFloor - 0.5, 0.06, wall, true);
          }
        }
        // Vertical mullions on a ~4.5 m module carry the grid the photographs show.
        const mullions = Math.round(f.length / 4.5);
        for (let k = 1; k < mullions; k++) {
          const t = k / mullions, w = 0.12 / f.length;
          panel(f, t - w, t + w, Math.max(from, datum + podiumTop), m.top - 0.6, 0.05, band);
        }
        panel(f, -0.002, 1.002, m.top - 0.6, m.top, 0.08, band);
      } else if (m.role === 'podium') {
        // Five podium levels of darker glass with floor lines; the street level is the lobby.
        const mid = at(f, 0.5, 0, 0), grade = gradeAt(mid[0], mid[2]);
        for (let y = datum + 3.6; y < m.top - 0.5; y += 3.6) if (y > Math.max(from, grade + 3)) panel(f, 0, 1, y - 0.3, y + 0.3, 0.04, band);
        if (from <= grade + 1) panel(f, 0.03, 0.97, grade + 0.3, grade + 4.6, 0.05, podiumGlass, true);
      } else {
        // The glass hub and pavilion are lit through at night.
        const mid = at(f, 0.5, 0, 0), lo = Math.max(gradeAt(mid[0], mid[2]) + 0.3, from);
        if (lo < m.top - 1) panel(f, 0.03, 0.97, lo, m.top - 0.8, 0.05, hubGlass, true);
      }
    }
  }
  return s.finish('#ffe3b8', 0.6);
}
