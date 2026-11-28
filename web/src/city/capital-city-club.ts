import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const capitalCityClubId = 'e8dfccb6-d71d-4e0b-a58f-478c6c47c757';
const origin: P2 = [336, -816];

/**
 * Capital City Club (7 John Portman Boulevard, formerly Harris Street; 1911). Heights are NAVD88
 * metres from the USGS GA_Statewide_B2_2018 lidar: grade 321.9, porch roof 328.8, west terrace
 * wing 325.5, the main brick block 345.4 and its taller north (rear) range 350. The mapped 33.6 m
 * overstates the street block. Photographs: Commons, Atlanta Capital City Club 2012-09-15 set.
 */
export const CAPITAL_CITY_CLUB = {
  grade: 321.9, terrace: 325.5, porch: 328.8, string: 333.4, eave: 344.6, roof: 345.4, parapet: 346.4, rear: 350.0,
} as const;

const brick = '#b9a48c', stone = '#dcd3c1', stoneShade = '#c4baa6', windows = ['#5f6b6e', '#677274', '#596466'],
  roof = '#8f8b84', recess = '#5b4a40';

export function createCapitalCityClub(buildings: VBuilding[], grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, capitalCityClubId, 'Capital City Club', origin, [1, 0], [[0, 0], [15, 0], [-30, 0]]);
  if (!s) return null;
  const H = CAPITAL_CITY_CLUB, seed = seedOf(capitalCityClubId);
  const rect = (u0: number, u1: number, v0: number, v1: number): P2[] => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  // Local (u, v): u east, v south (scene z is -north). Main block behind the porch bays.
  const [w, e, n, sth] = [-19.4, 19.7, -13.5, 8.2];
  const body = rect(w, e, n, sth), rear = rect(w, e, n, -5);

  s.prism(body, s.base, H.roof, brick, roof);
  s.prism(rear, H.roof, H.rear, brick, roof);
  // West terrace wing: one storey with a stone balustrade (lidar 325.5).
  const terrace = rect(-40.5, w, n, sth);
  s.prism(terrace, s.base, H.terrace, brick, '#9b9a90');

  type Face = { a: P2; b: P2; len: number; n: P2 };
  const faces = (ring: P2[]): Face[] => ring.map((a, i) => {
    const b = ring[(i + 1) % ring.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { a, b, len, n: [(b[1] - a[1]) / len, -(b[0] - a[0]) / len] as P2 };
  });
  const at = (f: Face, t: number, y: number, d: number) =>
    [f.a[0] + t * (f.b[0] - f.a[0]) + d * f.n[0], y, f.a[1] + t * (f.b[1] - f.a[1]) + d * f.n[1]];
  const panel = (f: Face, l: number, r: number, lo: number, hi: number, d: number, colour: string) =>
    s.body.quad(at(f, l, lo, d), at(f, l, hi, d), at(f, r, hi, d), at(f, r, lo, d), colour);
  /** A projecting band with its top and soffit returned to the wall. */
  const ledge = (f: Face, lo: number, hi: number, d: number, colour: string) => {
    panel(f, 0, 1, lo, hi, d, colour);
    s.body.quad(at(f, 0, hi, 0), at(f, 0, hi, d), at(f, 1, hi, d), at(f, 1, hi, 0), colour);
    s.body.quad(at(f, 0, lo, d), at(f, 0, lo, 0), at(f, 1, lo, 0), at(f, 1, lo, d), colour);
  };

  // Brick body: four storeys of stone-trimmed punched windows over the porch, a string course,
  // a stone cornice and a balustraded parapet.
  faces(body).forEach((f, face) => {
    litFacade(s, seed, face, f.a, f.b, H.porch + 0.4, H.eave - 0.6, 4, 3.2, 0.5, 0.62, windows, 0.12);
    // A stone sill line under each window row frames the openings (photographs).
    const pitch = (H.eave - 0.6 - (H.porch + 0.4)) / 4;
    for (let j = 0; j < 4; j++) {
      const y = H.porch + 0.4 + j * pitch + pitch * 0.19 - 0.25;
      panel(f, 0.02, 0.98, y, y + 0.25, 0.09, stone);
    }
    ledge(f, H.string, H.string + 0.5, 0.2, stone);
    ledge(f, H.eave, H.roof, 0.6, stone);
    panel(f, 0, 1, H.roof, H.parapet, 0.1, stoneShade);
    // Behind the porch: the ground floor's arched openings read as a dark band.
    panel(f, 0.04, 0.96, H.grade + 0.6, H.porch - 2, 0.05, recess);
  });
  faces(rear).forEach((f, face) => {
    if (f.n[1] > 0.9) return; // the rear range's south wall stands on the main roof
    litFacade(s, seed, 8 + face, f.a, f.b, H.roof + 0.4, H.rear - 0.8, 1, 3.2, 0.5, 0.6, windows, 0.12);
  });
  faces(terrace).forEach(f => panel(f, 0, 1, H.terrace, H.terrace + 0.9, 0.05, stone));

  // The porch: paired stone columns along the Portman Boulevard (south) and Peachtree (east)
  // fronts, carrying an entablature slab with a balustrade over the arched ground floor.
  const porch = rect(w, e, sth, 13.6);
  s.prism(porch, H.porch - 1.2, H.porch, stone, '#a9a59a');
  const front: Face = faces(porch).find(f => f.n[1] > 0.9)!;
  panel(front, 0, 1, H.porch, H.porch + 1, 0, stoneShade);
  const columns = Math.round(front.len / 3.4);
  for (let k = 0; k <= columns; k++) {
    const t = k / columns;
    for (const dt of [-0.35, 0.35]) {
      const [cx, , cz] = at(front, t + dt / front.len, 0, -0.5);
      s.body.box(0.55, H.porch - 1.2 - s.base, 0.55, cx, (s.base + H.porch - 1.2) / 2, cz, stone);
    }
  }
  // The porch turns the Peachtree corner as a short return of the same order.
  const side: Face = faces(body).find(f => f.n[0] > 0.9)!;
  ledge(side, H.porch - 1.2, H.porch, 2.6, stone);
  for (let k = 0; k <= 3; k++) {
    const [cx, , cz] = at(side, 0.6 + k * 0.13, 0, 2.3);
    s.body.box(0.55, H.porch - 1.2 - s.base, 0.55, cx, (s.base + H.porch - 1.2) / 2, cz, stone);
  }
  const club = s.finish('#f4d9a8', 0.6);
  // The porch runs unbroken across the entrance, where the mapped outline has a 5 m recess
  // (Commons: Atlanta Capital City Club 2012-09-15 06): it projects up to 3 m past the outline.
  club.group.userData.footprint = { maxProjection: 3.2 };
  return club;
}
