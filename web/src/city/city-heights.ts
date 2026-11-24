import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * City Heights, 375 Ralph McGill Boulevard NE (1980): an 18-storey condominium tower of red-brown
 * brick, its stepped corners wrapped in stacked white concrete balconies, with white end walls and a
 * white stepped crown. Photos: allatlantacondos.com gallery (https://www.allatlantacondos.com/?p=4298,
 * photos 1 and 3). Heights are NAVD88 metres from the April 2019 3DEP lidar, which disagrees with
 * the mapped 78.4 m: the roof is 360 m over a 304.6 m street (about 55 m, which 18 storeys at 3.1 m
 * also give), the crown parapets 362 m and the central penthouse 365.7 m
 * (docs/log/ui/city-heights/README.md). Flat vertex colours, no library surfaces: a painted body is
 * a hooked material that costs its own low-tier draw and shader program.
 */
export const cityHeightsId = 'osm:way:270356883';
const origin: P2 = [1453, -1089];

const roofTop = 360,
  parapetTop = 362,
  penthouseTop = 365.7,
  /** 18 storeys: a double-height lobby level and 17 floors above it. */
  floors = 17;

const brick = '#9a5a45',
  white = '#ebe8e0',
  whiteShade = '#d8d4ca',
  glass = '#7f8f99', // S 17%, V 60%: dark punched windows in the brick
  roof = '#9a968c';

export function createCityHeights(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  if (site.rings.length !== 1) return null;
  // Probes include the penthouse corners, so a re-mapped footprint falls back to the generic box.
  const s = landmarkShell(buildings, grid, site.id, 'City Heights', origin, [1, 0], [[0, 0], [-8, 0], [8, 0], [-6, -5], [6, -5], [6, 5], [-6, 5]]);
  if (!s) return null;
  const seed = seedOf(site.id);
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
  }).filter(f => f.length > 0.8);
  const at = (f: Face, t: number, y: number, depth: number) =>
    [f.a[0] + t * (f.b[0] - f.a[0]) + depth * f.n[0], y, f.a[1] + t * (f.b[1] - f.a[1]) + depth * f.n[1]];
  const panel = (f: Face, l: number, r: number, lo: number, hi: number, depth: number, color: string, lit = false) =>
    (lit ? s.lights : s.body).quad(at(f, l, lo, depth), at(f, l, hi, depth), at(f, r, hi, depth), at(f, r, lo, depth), color);

  const plan = local(site.rings[0]);
  const datum = s.base + 0.35;
  const lobby = datum + 4.6;
  const pitch = (roofTop - 1 - lobby) / floors;
  s.prism(plan, s.base, roofTop, brick, roof);

  faces(plan).forEach((f, face) => {
    // The mapped outline is a stepped octagon: four broad faces (7.5 m and more), the stepped faces
    // between them (3.5-6.5 m), short returns at each step, and the 6.5-7.5 m brick bays. In the
    // photographs the broad faces are white walls and the stepped faces carry the white balconies.
    const corner = f.length >= 3.5 && f.length < 6.5;
    const whiteWall = f.length >= 7.5;
    // Layers stand 4 cm apart (white 4, glass 8, lit 12, piers 16, crown 20 cm): closer ones z-fight at 400-600 m.
    if (whiteWall) panel(f, 0, 1, lobby, roofTop, 0.04, white);
    const bays = corner ? 1 : Math.max(1, Math.round(f.length / 3));
    // Punched windows, drawn cheaply: one window band per floor behind a pier per bay (brick or
    // white to match the wall); lit rooms sit between the two at night.
    const wall = whiteWall ? white : brick;
    if (!corner) for (let k = 0; k <= bays; k++) {
      const t = k / bays, w = 0.25 / bays;
      panel(f, Math.max(0, t - w), Math.min(1, t + w), lobby, roofTop - 1.2, 0.16, wall);
    }
    for (let j = 0; j < floors; j++) {
      const y = lobby + j * pitch;
      if (corner) {
        // Slab with a solid white front, wrapping the corner 1.3 m out.
        s.body.quad(at(f, -0.15, y, 0), at(f, -0.15, y, 1.3), at(f, 1.15, y, 1.3), at(f, 1.15, y, 0), white);
        panel(f, -0.15, 1.15, y - 0.3, y + 1.0, 1.3, j % 2 ? white : whiteShade);
      } else {
        panel(f, 0, 1, y + 0.7, y + pitch - 0.5, 0.08, glass);
      }
      for (let k = 0; k < bays; k++) {
        if (litHash(seed, face, j, k) > 0.36) continue;
        // Same extent as the unlit band and between the piers, so by day lit bays look the same.
        const [l, r] = corner ? [0.15, 0.85] : [(k + 0.25) / bays, (k + 0.75) / bays];
        panel(f, l, r, y + 0.7, y + pitch - 0.5, 0.12, glass, true);
      }
    }
    // White crown band and parapet.
    panel(f, -0.01, 1.01, roofTop - 1.2, roofTop, 0.2, white);
    // Lobby glazing at street level.
    panel(f, 0.08, 0.92, datum + 0.3, lobby - 0.8, 0.08, glass, true);
  });

  // Crown: a white parapet ring set in from the roof edge, and the central penthouse with a small
  // pediment on its south (Ralph McGill) face.
  const inset = (p: P2[], d: number): P2[] => p.map(([u, v]) => { const l = Math.hypot(u, v) || 1; return [u - d * u / l, v - d * v / l]; });
  s.prism(inset(plan, 1.5), roofTop, parapetTop, white, roof);
  const pent: P2[] = [[-6, -5], [6, -5], [6, 5], [-6, 5]];
  s.prism(pent, parapetTop, penthouseTop, white, roof);
  s.body.tri([-4, penthouseTop, 5.05], [4, penthouseTop, 5.05], [0, penthouseTop + 2.2, 5.05], whiteShade);
  s.body.tri([4, penthouseTop, 5.05], [-4, penthouseTop, 5.05], [0, penthouseTop + 2.2, 5.05], whiteShade);
  return s.finish('#ffdcae', 0.95);
}
