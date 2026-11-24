import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * Bethel Towers, 210 Auburn Avenue NE, and the Big Bethel garage-and-shops podium in front of it on
 * Auburn Avenue. The tower is a plain orange-red brick apartment slab with a regular grid of punched
 * windows, a thin light concrete parapet band and a brick mechanical box on the west end of the roof
 * (Commons, "Bethel Towers, Atlanta, GA", 2019; HABS GA-1170 C-13, 1979). The podium is a concrete
 * frame with shopfronts, a garage portal and a slotted parapet (HABS). Heights are NAVD88 metres from
 * the April 2019 3DEP lidar, which disagrees with the mapped 62.7 m: roof 342.5 m over a 295.8 m
 * street (about 47 m), the box 347.6 m, the garage deck 300.5 m and the Auburn frontage 303 m
 * (docs/log/ui/bethel-towers/README.md). Flat vertex colours, no library surfaces.
 */
export const bethelTowersId = 'osm:way:102162996';
export const bethelPodiumId = 'osm:way:841048591';

const roofTop = 342.5,
  boxTop = 347.6,
  deckTop = 300.5,
  frontTop = 303,
  floors = 13;

const brick = '#b07a5e', // the 2019 photo's sunlit brick median is #b78669; a touch darker for City's grade
  concrete = '#d6d2c8',
  concreteShade = '#bdb8ad',
  glass = '#76858e',
  dark = '#3b3f42',
  storefront = '#4c5a62',
  roof = '#8f8b84';

type Face = { a: P2; b: P2; length: number; n: P2 };

function frame(site: VBuilding, origin: P2) {
  const plan = site.rings[0].map(([x, z]): P2 => [x - origin[0], z - origin[1]]);
  const area = plan.reduce((sum, [x, z], i) => sum + x * plan[(i + 1) % plan.length][1] - plan[(i + 1) % plan.length][0] * z, 0);
  const ring = area < 0 ? plan.reverse() : plan;
  const faces = (p: P2[]): Face[] => p.map((a, i) => {
    const b = p[(i + 1) % p.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { a, b, length, n: [(b[1] - a[1]) / length, -(b[0] - a[0]) / length] as P2 };
  }).filter(f => f.length > 1.5);
  const at = (f: Face, t: number, y: number, depth: number) =>
    [f.a[0] + t * (f.b[0] - f.a[0]) + depth * f.n[0], y, f.a[1] + t * (f.b[1] - f.a[1]) + depth * f.n[1]];
  return { ring, faces, at };
}

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const origin: P2 = [1012, -252];

/**
 * The tower and its podium are two mapped sites but one shell, so they share one lamps mesh (one
 * night draw). Whichever site the terrain builder reaches first builds both and claims both; the
 * other then finds its site gone and returns null.
 */
export function createBethel(buildings: VBuilding[], grid: GroundGrid) {
  const tower = buildings.find(b => b.id === bethelTowersId), podium = buildings.find(b => b.id === bethelPodiumId);
  if (tower?.rings.length !== 1 || podium?.rings.length !== 1) return null;
  const s = landmarkShell(buildings, grid, tower.id, 'Bethel Towers', origin, [1, 0], [[0, 0], [-10, 0], [10, 0]]);
  if (!s) return null;
  // The podium's L, probed as the tower is: the arm (1006,-220 and -240) and the deck (1031,-248).
  const podiumRing = frame(podium, origin).ring;
  if (![[-6, 32], [-6, 12], [19, 4]].every(([u, v]) => pointInRing(u, v, podiumRing))) return null;
  buildTower(s, tower);
  buildPodium(s, podium, grid);
  const out = s.finish('#ffdcae', 0.8);
  return { ...out, buildings: out.buildings.filter(b => b !== podium) };
}

function buildTower(s: Shell, site: VBuilding) {
  const seed = seedOf(site.id);
  const { ring, faces, at } = frame(site, origin);
  const panel = (f: Face, l: number, r: number, lo: number, hi: number, depth: number, color: string, lit = false) =>
    (lit ? s.lights : s.body).quad(at(f, l, lo, depth), at(f, l, hi, depth), at(f, r, hi, depth), at(f, r, lo, depth), color);
  const datum = s.base + 0.35;
  const lobby = datum + 4.2;
  const pitch = (roofTop - 1.6 - lobby) / floors;

  s.prism(ring, s.base, roofTop, brick, roof);
  faces(ring).forEach((f, face) => {
    // Layers stand 4 cm apart or more (closer ones z-fight at 400-600 m).
    // Punched windows: one window band per floor behind a brick pier per bay (as the photos show,
    // a regular grid with brick between each window); lit homes sit between the two at night.
    const bays = Math.max(1, Math.round(f.length / 2.1));
    for (let k = 0; k <= bays; k++) {
      const t = k / bays, w = 0.3 / bays;
      panel(f, Math.max(0, t - w), Math.min(1, t + w), lobby, roofTop - 1.6, 0.12, brick);
    }
    for (let j = 0; j < floors; j++) {
      const y = lobby + j * pitch;
      panel(f, 0, 1, y + 0.8, y + pitch - 0.6, 0.04, glass);
      for (let k = 0; k < bays; k++) {
        if (litHash(seed, face, j, k) > 0.34) continue;
        panel(f, (k + 0.3) / bays, (k + 0.7) / bays, y + 0.8, y + pitch - 0.6, 0.08, glass, true);
      }
    }
    // The thin light concrete parapet band, and the ground-floor lobby.
    panel(f, -0.004, 1.004, roofTop - 1.2, roofTop, 0.08, concrete);
    panel(f, 0.1, 0.9, datum + 0.3, lobby - 0.7, 0.05, glass, true);
  });
  // Brick mechanical box on the west end of the roof (lidar 347.6 m at x 998-1004, z -252 to -244).
  const box: P2[] = [[-11.5, 0], [-7, 0], [-7, 7.5], [-11.5, 7.5]];
  if (box.every(([u, v]) => pointInRing(u, v, ring))) s.prism(box, roofTop, boxTop, brick, roof);
}

function buildPodium(s: Shell, site: VBuilding, grid: GroundGrid) {
  // The site is an L: a 12 m arm from Auburn Avenue north to the tower's south wall (z -244), then
  // the deck east of the tower (x 1012-1041, z -238 to -256). It stands on its own grade.
  const grades = site.rings[0].map(([x, z]) => grid.sample(x, z) ?? s.base + 0.35);
  const base = Math.min(...grades) - 0.35;
  const { ring, faces, at } = frame(site, origin);
  const panel = (f: Face, l: number, r: number, lo: number, hi: number, depth: number, color: string, lit = false) =>
    (lit ? s.lights : s.body).quad(at(f, l, lo, depth), at(f, l, hi, depth), at(f, r, hi, depth), at(f, r, lo, depth), color);
  const datum = base + 0.35;
  // The deck, then the taller Auburn Avenue frontage across the arm's south end (z grows to the south).
  s.prism(ring, base, deckTop, concrete, roof);
  // The Auburn edge is the ring's southernmost run, mapped as two collinear pieces; it is laid out
  // as one face so it gets one garage portal, as the HABS photo shows.
  const edge = Math.max(...ring.map(p => p[1]));
  const onAuburn = (f: Face) => f.n[1] > 0.7 && Math.min(f.a[1], f.b[1]) > edge - 0.5;
  const xs = ring.filter(p => p[1] > edge - 0.5).map(p => p[0]);
  const west = Math.min(...xs) + 0.05, east = Math.max(...xs) - 0.05;
  const auburn: Face = { a: [east, edge], b: [west, edge], length: east - west, n: [0, 1] };
  // The frontage strip's own wall stands 0.1 m inside the mapped edge (whose ends are on the ring).
  const parapet: Face = { ...auburn, a: [east, edge - 0.1], b: [west, edge - 0.1] };
  // Lidar: the shops stand to 303 m in a 7 m strip at x 1000-1011, z -200 to -193.
  const back = -200 - origin[1] + 0.1; // z -199.9
  const front: P2[] = [[west, back], [east, back], [east, edge - 0.1], [west, edge - 0.1]];
  if (front.every(([u, v]) => pointInRing(u, v, ring))) s.prism(front, deckTop, frontTop, concrete, roof);
  // Concrete frame: a column every ~6 m. Along Auburn, shopfronts and one garage portal between them,
  // under a slotted parapet; elsewhere the deck's open sides read dark between the columns.
  for (const f of [auburn, ...faces(ring).filter(f => !onAuburn(f))]) {
    const facingAuburn = f === auburn;
    const bays = Math.max(1, Math.round(f.length / 6));
    for (let k = 0; k < bays; k++) {
      const l = (k + 0.08) / bays, r = (k + 0.92) / bays;
      if (facingAuburn) {
        const portal = k === Math.floor(bays / 2);
        panel(f, l, r, datum + 0.3, datum + 3.6, 0.04, portal ? dark : storefront, !portal);
        for (let slot = 0; slot < 4; slot++) {
          const sl = l + (r - l) * (0.15 + slot * 0.2), sr = sl + (r - l) * 0.08;
          panel(parapet, sl, sr, frontTop - 1.6, frontTop - 0.6, 0.04, concreteShade);
        }
      } else {
        panel(f, l, r, datum + 0.6, deckTop - 0.9, 0.04, dark);
      }
    }
  }
}
