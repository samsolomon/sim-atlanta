import { ShapeUtils, Vector2 } from 'three';
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
 * and 4.0 m office floors. Each tower is two knife-edged glass halves either side of a dark slot,
 * with lower end shoulders, as OSM's parts describe. Each half rises straight from grade (any lean
 * at the base is not modelled) to a sail roof that rakes `sailRise` (6 m, estimated from the 2022
 * photographs) up toward its tower's slot; the slot and shoulders are a dark reveal. The glass hub reaches the street lobby, as the
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
  officeFloor = 4.0,
  /** How far each half's roof rakes up toward its tower's slot (estimated from the photos). */
  sailRise = 6;
/** OSM height (3.6 m per level) → HOK floor count (two more levels) → metres over grade. */
export function inferred(osmH: number) {
  const level = osmH / 3.6 + 2;
  return podiumTop + (level - 5) * officeFloor;
}

// The two identifiers from the 2022 photos: halves of a deeper, more saturated blue than the generic
// glass around them, split by a near-black full-height slot; and sail roofs that rake up to the slot.
// Bases follow the provisional base-value table (base V >= 62 -> S <= 30); the rendered check decides.
const glass = '#7a93ad', // S 29%, V 68%: the halves
  band = '#5f6f7e', // S 24%, V 49%: floor lines and mullions
  slotGlass = '#7b8087', // S 9%, V 53%: the deep slot (renders V ~20 in its own shade)
  podiumGlass = '#6f7d8a', // S 20%, V 54%
  hubGlass = '#4f5964', // S 21%, V 39%: the dark-tinted glass hub, lit within
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

  const centroid = (plan: P2[]): P2 => plan.reduce(([a, b], [u, v]) => [a + u / plan.length, b + v / plan.length], [0, 0]);
  const slots = masses.filter(m => m.role === 'slot');
  // Without its slots (an OSM re-map) the sails have nothing to rise toward: use the generic box.
  if (!slots.length) return null;
  /** Raked roof heights for a tall half: rising linearly toward the nearest slot. */
  const sail = (m: Mass) => {
    const c = centroid(m.plan);
    const slot = slots.reduce((a, b) => {
      const da = Math.hypot(...(centroid(a.plan).map((x, i) => x - c[i]) as [number, number]));
      const db = Math.hypot(...(centroid(b.plan).map((x, i) => x - c[i]) as [number, number]));
      return db < da ? b : a;
    });
    // Rake along the normal of the half's face nearest the slot, so the whole slot-side edge is the
    // level peak (the photographs' knife edge), not just one corner.
    const sc = centroid(slot.plan);
    let best = { d: Infinity, dir: [0, 0] as P2 };
    m.plan.forEach(([u, v], i) => {
      const [u2, v2] = m.plan[(i + 1) % m.plan.length], len = Math.hypot(u2 - u, v2 - v);
      if (len < 2) return;
      const d = Math.hypot((u + u2) / 2 - sc[0], (v + v2) / 2 - sc[1]);
      if (d < best.d) best = { d, dir: [(v2 - v) / len, -(u2 - u) / len] };
    });
    const toward = (sc[0] - c[0]) * best.dir[0] + (sc[1] - c[1]) * best.dir[1];
    const dir: P2 = toward < 0 ? [-best.dir[0], -best.dir[1]] : best.dir;
    const proj = m.plan.map(([u, v]) => (u - c[0]) * dir[0] + (v - c[1]) * dir[1]);
    const lo = Math.min(...proj), hi = Math.max(...proj);
    return proj.map(p => m.top + sailRise * (p - lo) / (hi - lo || 1));
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
    // The slot and the recessed end shoulders are the dark reveals that frame the bright halves.
    const wall = m.role === 'slot' || m.role === 'shoulder' ? slotGlass : tower ? glass : m.role === 'podium' ? podiumGlass : hubGlass;
    if (m.role === 'tall') {
      // The sail: walls straight up to the raked edge (no hidden flat roof), a raked roof, and a dark
      // edge band 0.08 m proud of the wall.
      const tops = sail(m);
      m.plan.forEach(([u, v], i) => {
        const j = (i + 1) % m.plan.length, [u2, v2] = m.plan[j];
        const len = Math.hypot(u2 - u, v2 - v) || 1, nu = (v2 - v) / len * 0.08, nv = -(u2 - u) / len * 0.08;
        s.body.quad([u, s.base, v], [u, tops[i], v], [u2, tops[j], v2], [u2, s.base, v2], wall);
        s.body.quad([u + nu, tops[i] - 0.7, v + nv], [u + nu, tops[i] + 0.02, v + nv], [u2 + nu, tops[j] + 0.02, v2 + nv], [u2 + nu, tops[j] - 0.7, v2 + nv], band);
      });
      for (const [a, b, c] of ShapeUtils.triangulateShape(m.plan.map(([u, v]) => new Vector2(u, v)), [])) {
        const p = (k: number) => [m.plan[k][0], tops[k], m.plan[k][1]];
        s.body.tri(p(a), p(c), p(b), roof);
      }
    } else {
      s.prism(m.plan, s.base, m.top, wall, roof);
    }
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
        // The flat cornice belongs to the shoulders and slots; a tall half's top is the raked band.
        if (m.role !== 'tall') panel(f, -0.002, 1.002, m.top - 0.6, m.top, 0.08, band);
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
