import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * The Commons at Imperial Hotel, 355 Peachtree Street NE: the 1910 Imperial Hotel (Edward E.
 * Dougherty), now supportive housing. A ten-storey brown-red brick block. Its narrow Peachtree front
 * faces west, over a one-storey brick arcade of arches with stone caps, with iron balconies at the
 * third and eighth floors and an ornamented brick cornice band. The long north side, on Ralph McGill,
 * carries six stacks of white bay windows from the third floor to the top; the east end is
 * banded tan and red since the 2014 renovation (Commons photographs 2012-2019, see
 * docs/log/ui/imperial-hotel/README.md). The rooftop "IMPERIAL HOTEL" letters are a name sign and
 * are not drawn. Heights are NAVD88 metres from the April 2019 3DEP lidar, which puts the roof at
 * about 344.5 m over a 312-313 m street (about 32 m, against the mapped 36.5 m) and a stair and
 * lift penthouse at 346.3 m. Flat vertex colours, no library surfaces.
 */
export const imperialHotelId = '6f11e54d-90fa-4264-bc3d-771704366472';
const penthousePart = 'overture:4b3f52fe-7414-31dc-8558-dd55c50d5b2a';
const blockPart = 'overture:922b219b-c091-3abd-b70a-8d2d102eeea7';
const arcadePart = 'overture:09ca5bb1-77ad-362e-adde-b70306e84025';
const origin: P2 = [560, -1127];

const roofTop = 344.5,
  penthouseTop = 346.3,
  arcadeRise = 5,
  floors = 9; // above a tall ground floor: ten storeys

const brick = '#7c4c42', // brown-red: the photos read #77696d-#a78572 sunlit on Peachtree, #4c2620 in shade on the north side
  cornice = '#5e4e4a', // the dark ornamented band under the parapet (#3f3a3f in the 2019 photo)
  stone = '#b5a48f', // the arcade's caps and arch rings
  white = '#dadedf', // the bay-window stacks (#dde5ea sunlit)
  tan = '#a68a76', // the east end's bands (#bfa293 sunlit; darker, since City's sun lifts it to near white)
  eastRed = '#a35a4c', // between them (#c38072 sunlit)
  glass = '#6f7d86',
  iron = '#2f3032',
  roof = '#8d8984';

type Face = { a: P2; b: P2; length: number; n: P2 };

export function createImperialHotel(buildings: VBuilding[], grid: GroundGrid) {
  const site = buildings.find(b => b.id === imperialHotelId);
  const part = (id: string) => site?.parts?.find(p => p.id === id);
  const penthouse = part(penthousePart), blockSite = part(blockPart), arcadeSite = part(arcadePart);
  if (!site || site.rings.length !== 1 || penthouse?.rings.length !== 1 || !blockSite || arcadeSite?.rings.length !== 1) return null;
  const s = landmarkShell(buildings, grid, imperialHotelId, 'The Commons at Imperial Hotel', origin, [1, 0], [[0, 0], [-15, 0], [15, 0]]);
  if (!s) return null;
  const seed = seedOf(imperialHotelId);
  const local = (ring: [number, number][]): P2[] => {
    const plan = ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]);
    const area = plan.reduce((sum, [x, z], i) => sum + x * plan[(i + 1) % plan.length][1] - plan[(i + 1) % plan.length][0] * z, 0);
    const ccw = area < 0 ? plan.reverse() : plan;
    // Drop vertices on straight runs (the mapped Peachtree walls bend by under a degree), so each
    // wall is one face and its arcade or balconies run its whole length.
    return ccw.filter((q, i) => {
      const a = ccw[(i + ccw.length - 1) % ccw.length], b = ccw[(i + 1) % ccw.length];
      const ux = q[0] - a[0], uz = q[1] - a[1], vx = b[0] - q[0], vz = b[1] - q[1];
      return Math.abs(ux * vz - uz * vx) / (Math.hypot(ux, uz) * Math.hypot(vx, vz)) > 0.03 || ux * vx + uz * vz < 0;
    });
  };
  const gradeAt = (u: number, v: number) => grid.sample(u + origin[0], v + origin[1]) ?? s.base;
  const edge = (a: P2, b: P2): Face => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { a, b, length, n: [(b[1] - a[1]) / length, -(b[0] - a[0]) / length] as P2 };
  };
  const faces = (p: P2[]): Face[] => p.map((a, i) => edge(a, p[(i + 1) % p.length])).filter(f => f.length > 1.5);
  const at = (f: Face, t: number, y: number, depth: number) =>
    [f.a[0] + t * (f.b[0] - f.a[0]) + depth * f.n[0], y, f.a[1] + t * (f.b[1] - f.a[1]) + depth * f.n[1]];
  const panel = (f: Face, l: number, r: number, lo: number, hi: number, depth: number, color: string, lit = false) =>
    (lit ? s.lights : s.body).quad(at(f, l, lo, depth), at(f, l, hi, depth), at(f, r, hi, depth), at(f, r, lo, depth), color);
  const flat = (f: Face, l: number, r: number, y: number, d: number, color: string) =>
    s.body.quad(at(f, l, y, 0), at(f, l, y, d), at(f, r, y, d), at(f, r, y, 0), color);

  // The block and the Peachtree arcade strip west of it are mapped parts (the block's inner ring is
  // the penthouse, drawn on its own below).
  const wall = local(blockSite.rings[0]);
  const strip = local(arcadeSite.rings[0]);
  if (wall.length < 4 || strip.length < 4) return null;
  const westFace = faces(wall).reduce((m, f) => (f.n[0] < m.n[0] ? f : m));
  const westMid = at(westFace, 0.5, 0, 0), westGrade = gradeAt(westMid[0], westMid[2]);

  s.prism(wall, s.base, roofTop, brick, roof);
  faces(wall).forEach((f, face) => {
    const mid = at(f, 0.5, 0, 0), grade = gradeAt(mid[0], mid[2]);
    const lobby = grade + 4.4, pitch = (roofTop - 1.8 - lobby) / floors;
    const north = f.n[1] < -0.7, east = f.n[0] > 0.7 && f.length > 10, west = f === westFace;
    // Layers stand 4 cm apart or more (closer ones z-fight at 400-600 m): east red 4, tan bands 8,
    // window bands 12, lit rooms 16, piers 20, cornice 24 cm.
    // Punched windows: a window band per floor behind brick piers, about 1.9 m to a bay. The east
    // end is red with a tan band at each floor's window height (the 2015 and later photos), with
    // single windows set in the tan, so there it draws panes rather than a band behind piers.
    const bays = Math.max(1, Math.round(f.length / (west ? 2.3 : 1.9)));
    if (east) panel(f, 0, 1, s.base, roofTop, 0.04, eastRed);
    if (!east) for (let k = 0; k <= bays; k++) {
      const t = k / bays, w = 0.27 / bays;
      panel(f, Math.max(0, t - w), Math.min(1, t + w), lobby, roofTop - 1.8, 0.2, brick);
    }
    for (let j = 0; j < floors; j++) {
      const y = lobby + j * pitch;
      if (east) {
        panel(f, 0, 1, y + 0.5, y + pitch - 0.3, 0.08, tan);
        for (let k = 0; k < bays; k++)
          panel(f, (k + 0.3) / bays, (k + 0.7) / bays, y + 0.8, y + pitch - 0.6, 0.12, glass, litHash(seed, face, j, k) < 0.33);
      } else {
        panel(f, 0, 1, y + 0.75, y + pitch - 0.55, 0.12, glass);
        for (let k = 0; k < bays; k++)
          if (litHash(seed, face, j, k) < 0.33) panel(f, (k + 0.3) / bays, (k + 0.7) / bays, y + 0.75, y + pitch - 0.55, 0.16, glass, true);
      }
      // Peachtree front: iron balconies under the windows at the third and eighth floors.
      if (west && (j === 1 || j === 6)) for (let k = 0; k < bays; k++) {
        flat(f, (k + 0.2) / bays, (k + 0.8) / bays, y + 0.1, 0.45, iron);
        panel(f, (k + 0.2) / bays, (k + 0.8) / bays, y + 0.1, y + 1.0, 0.45, iron);
      }
    }
    // The ground floor: tall windows; on the north side the old shopfronts.
    if (!west) for (let k = 0; k < bays; k++)
      panel(f, (k + 0.25) / bays, (k + 0.75) / bays, grade + 0.9, lobby - 0.8, 0.12, glass, north && litHash(seed, face, 40, k) < 0.5);
    // The ornamented brick cornice band, darker, under a plain parapet.
    panel(f, -0.24 / f.length, 1 + 0.24 / f.length, roofTop - 1.6, roofTop - 0.4, 0.24, east ? eastRed : cornice);
    // White bay-window stacks on Ralph McGill, from the third floor to the top: two on the western
    // block, which steps 3.5 m forward, and four on the rest (the 2012 photos from Courtland).
    const stacks = Math.round(f.length / 6.5);
    if (north) for (let k = 0; k < stacks; k++) {
      const c = (k + 0.5) / stacks, half = 1.8 / f.length, nose = 1.2 / f.length;
      const lo = lobby + pitch, hi = roofTop - 1.8;
      const plan: P2[] = [at(f, c - half, 0, 0), at(f, c - nose, 0, 0.85), at(f, c + nose, 0, 0.85), at(f, c + half, 0, 0)]
        .map(p => [p[0], p[2]] as P2);
      s.prism(plan, lo, hi, white, white);
      // The two canted sides (about 1 m) and the nose; never the back edge against the wall.
      const sides: Face[] = [edge(plan[0], plan[1]), edge(plan[1], plan[2]), edge(plan[2], plan[3])];
      for (let j = 1; j < floors; j++) {
        const y = lobby + j * pitch;
        sides.forEach((g, i) => panel(g, 0.12, 0.88, y + 0.55, y + pitch - 0.45, 0.05, glass, litHash(seed, 50 + k, j, i) < 0.33));
      }
    }
  });

  // The Peachtree arcade: a one-storey brick porch of arches with stone caps, lit doors behind.
  {
    const top = westGrade + arcadeRise;
    s.prism(strip, s.base, top, brick, roof);
    const front = faces(strip).reduce((m, f) => (f.n[0] < m.n[0] ? f : m));
    const arches = 5, segments = 6, spring = top - 2.3;
    const half = 0.35 / arches, radius = half * front.length;
    for (let k = 0; k < arches; k++) {
      const c = (k + 0.5) / arches;
      panel(front, c - half, c + half, westGrade + 0.2, spring, 0.05, glass, true);
      // A round head: lit glass inside a stone arch ring.
      const point = (i: number, grow: number, depth: number) => {
        const angle = Math.PI * (1 - i / segments);
        return at(front, c + Math.cos(angle) * (radius + grow) / front.length, spring + Math.sin(angle) * (radius + grow), depth);
      };
      for (let i = 0; i < segments; i++) {
        s.lights.tri(at(front, c, spring, 0.05), point(i, 0, 0.05), point(i + 1, 0, 0.05), glass);
        s.body.quad(point(i, 0, 0.1), point(i, 0.3, 0.1), point(i + 1, 0.3, 0.1), point(i + 1, 0, 0.1), stone);
      }
    }
    panel(front, -0.1 / front.length, 1 + 0.1 / front.length, top - 0.4, top, 0.1, stone);
  }

  // The stair and lift penthouse over the middle of the block.
  const pen = local(penthouse.rings[0]);
  if (pen.every(([u, v]) => pointInRing(u, v, wall))) s.prism(pen, roofTop, penthouseTop, brick, roof);
  return s.finish('#ffdcae', 0.7);
}
