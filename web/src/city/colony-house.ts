import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * Colony House, 145 15th Street NE (1972–73): a 14-storey condominium slab in raw grey concrete,
 * bent to follow the diagonal grid beside Colony Square. Its long faces are a deep grid of recessed
 * balconies between concrete floor slabs and cross walls; its narrow ends are blank board-formed
 * concrete. Two low wings run toward 15th Street. Evidence, estimates and gaps:
 * docs/log/ui/colony-house/README.md.
 */
export const colonyHouseId = 'osm:way:536740360';
const slabId = 'osm:way:1451518600';
const coreIds = ['osm:way:1451518597', 'osm:way:1451518598', 'osm:way:1451518599'];

// Roofs in NAVD88 metres from the April 2019 lidar. The mapped 62 m is too tall: the slab roof sits
// at about 340.2, the stair and lift cores at about 343.5, and the wings at 305.3 and 300.7.
const slabRoof = 340.2, coreRoof = 343.5;
const wingRoofs: Record<string, number> = { 'osm:way:1414724126': 305.3, 'osm:way:1414724125': 300.7 };
const entryNavd = 296, lobbyH = 3.6, floors = 13;

// Flat vertex colours: a painted library surface compiles its own shader program.
// Slab edges and balcony fronts are lighter board-formed concrete than the walls, so the grid holds
// against the recesses even on shaded faces at 400 m.
const concrete = '#b4b1a9', front = '#dcd8ce', recess = '#6e7376', recessLit = '#707578';
const roofColor = '#8f8f8a';

function ccw(ring: P2[]): P2[] {
  let area = 0;
  ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; area += x * b - a * z; });
  return area > 0 ? ring : [...ring].reverse();
}

export function createColonyHouse(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const slabPart = site.parts?.find(p => p.id === slabId);
  if (!slabPart?.rings.length) return null;
  const origin: P2 = [853, -3808];
  const s = landmarkShell(buildings, grid, site.id, 'Colony House', origin, [1, 0], [[0, 0], [-35, -40], [30, 30]]);
  if (!s) return null;
  const seed = seedOf(site.id);
  const local = (ring: [number, number][]): P2[] => ccw(ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]));
  const panel = (lit: boolean, a: P2, b: P2, t0: number, t1: number, lo: number, hi: number, out: number, color: string) => {
    if (hi - lo < 0.05 || t1 <= t0) return;
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const p = (t: number, y: number) => [a[0] + t * dx + out * dz / l, y, a[1] + t * dz - out * dx / l];
    (lit ? s.lights : s.body).quad(p(t0, lo), p(t0, hi), p(t1, hi), p(t1, lo), color);
  };

  // Low wings toward 15th Street, then the lift and stair cores that rise above the slab.
  const others: { plan: P2[]; top: number }[] = [];
  for (const part of site.parts ?? []) {
    if (!part.rings.length) continue;
    const plan = local(part.rings[0]);
    if (wingRoofs[part.id]) { s.prism(plan, s.base, wingRoofs[part.id], concrete, roofColor); others.push({ plan, top: wingRoofs[part.id] }); }
    else if (coreIds.includes(part.id)) { s.prism(plan, s.base, coreRoof, concrete, roofColor); others.push({ plan, top: coreRoof }); }
  }

  // The slab: concrete to the roof, with recessed balcony floors on the long faces.
  const slab = local(slabPart.rings[0]);
  s.prism(slab, s.base, slabRoof, concrete, roofColor);
  const pitch = (slabRoof - 1.2 - entryNavd - lobbyH) / floors;
  slab.forEach((a, edge) => {
    const b = slab[(edge + 1) % slab.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // Narrow ends and short jogs stay blank concrete, as the end walls on 15th Street are.
    if (length < 20) return;
    // Faces against a core or wing are hidden up to that part's roof.
    const mid: P2 = [(a[0] + b[0]) / 2 + 1.2 * (b[1] - a[1]) / length, (a[1] + b[1]) / 2 - 1.2 * (b[0] - a[0]) / length];
    const covered = Math.max(-Infinity, ...others.filter(o => pointInRing(mid[0], mid[1], o.plan)).map(o => o.top));
    const bays = Math.round(length / 3.6);
    // Each floor: a dark balcony recess band under the concrete slab edge, divided by cross walls.
    for (let f = 0; f < floors; f++) {
      const lo = entryNavd + lobbyH + f * pitch;
      if (lo + pitch <= covered) continue;
      panel(false, a, b, 0.01, 0.99, lo + 0.75, lo + pitch, 0.02, recess);
      // The slab edge and balcony front: a pale band standing proud of the wall.
      panel(false, a, b, 0, 1, lo, lo + 0.75, 0.12, front);
      for (let i = 0; i < bays; i++) {
        if (litHash(seed, edge, f, i) >= 0.3) continue;
        panel(true, a, b, (i + 0.15) / bays, (i + 0.85) / bays, lo + 0.6, lo + pitch - 0.2, 0.04, recessLit);
      }
    }
    for (let i = 1; i < bays; i++) {
      const t = i / bays, w = 0.25 / length;
      if (covered < slabRoof - 1.2) panel(false, a, b, t - w, t + w, Math.max(entryNavd + lobbyH, covered), slabRoof - 1.2, 0.08, front);
    }
  });

  return s.finish('#f2e2c4', 0.62);
}
