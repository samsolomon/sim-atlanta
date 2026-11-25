import { surfaces } from '../materials';
import { drapeRing, landscapeMesh } from '../landscape/primitives';
import { drapeTriangle, type DrapeGround } from '../terrain/drape';
import { Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { localLandmarkShell } from './landmark-shell';

export const ansleyClubhouseId = 'osm:way:269222144';
const origin: P2 = [1453, -5157];
const axis: P2 = [.435, -.9];
const length = Math.hypot(...axis);
const c = axis[0] / length, s = axis[1] / length;
const world = (u: number, v: number): P2 => [origin[0] + c * u - s * v, origin[1] + s * u + c * v];

const siding = surfaces.clapboard();
const stone = surfaces.granite({ course: .42 });
const roof = surfaces.asphaltRoof({ strength: .65 });
const white = '#e6e2d6', masonry = '#a9a69b', charcoal = '#535557';
const windows = ['#4e5958', '#566464', '#626b64'];

export function createAnsleyClubhouse(buildings: VBuilding[], site: VBuilding, foundation: number | null,
  groundAt: (x: number, z: number) => number | null) {
  const grade = groundAt(...world(12, 28));
  if (foundation === null || grade === null || site.rings.length !== 1) return null;
  const shell = localLandmarkShell(buildings, site, 'Ansley Golf Club clubhouse', origin, axis,
    [[0, 0], [11, 20], [-12, -8]], foundation - grade - .2, grade);
  if (!shell) return null;
  const { body, facade, paint, prism } = shell;
  // The covered valet lane occupies the outer six metres of the mapped entrance wing.
  const ring = shell.ring.map(([u, v]): P2 => u > 5 && u < 19 && v > 22.4 ? [u, 22.4] : [u, v]);
  prism(ring, shell.base, .3, masonry, white, { wall: stone });
  prism(ring, .3, 5.6, white, charcoal, { wall: siding });
  for (const [i, a] of ring.entries()) {
    const b = ring[(i + 1) % ring.length];
    const length = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (length < 3) continue;
    // Ring winding faces out from the clapboard. The downhill foundation has a lower level.
    const from = b, to = a;
    if (Math.max(a[1], b[1]) < -10 || Math.max(a[0], b[0]) < -23) {
      facade(from, to, -4.8, -.45, 1, 3.2, .56, .54, windows, .07);
      facade(from, to, .3, 5.55, 2, 2.8, .82, .77, windows, .19);
    } else {
      facade(from, to, .55, 4.9, 1, 3.7, .45, .67, windows, .11);
    }
  }

  const gable = (u0: number, u1: number, back: number, front: number, eave: number, ridge: number) => {
    const mid = (u0 + u1) / 2;
    paint(roof, () => {
      body.quad([u0, eave, back], [u0, eave, front], [mid, ridge, front], [mid, ridge, back], charcoal);
      body.quad([mid, ridge, back], [mid, ridge, front], [u1, eave, front], [u1, eave, back], charcoal);
    });
    paint(siding, () => {
      body.tri([u0, eave, front], [u1, eave, front], [mid, ridge, front], white);
      body.tri([u1, eave, back], [u0, eave, back], [mid, ridge, back], white);
    });
  };
  const hip = (u0: number, u1: number, v0: number, v1: number, eave: number, ridge: number) => paint(roof, () => {
    const v = (v0 + v1) / 2;
    const a = [u0 + 5, ridge, v], b = [u1 - 5, ridge, v];
    body.quad([u0, eave, v0], [u1, eave, v0], b, a, charcoal);
    body.quad([u1, eave, v1], [u0, eave, v1], a, b, charcoal);
    body.tri([u0, eave, v1], [u0, eave, v0], a, charcoal);
    body.tri([u1, eave, v0], [u1, eave, v1], b, charcoal);
  });
  hip(-27, 29.4, -14.4, 11, 5.62, 9.6);
  gable(-24.4, -7.1, 6, 24.4, 5.64, 10.2);
  gable(6.3, 18.15, 12, 29.35, 5.64, 10.75);
  body.box(12, .38, 15.45, 12.2, 5.44, 21.65, white);
  for (const u of [6.75, 9.15, 15.3, 17.7]) {
    const pier = u < 7 || u > 17;
    const foot = (groundAt(...world(u, 28.7)) ?? grade) - grade - .08;
    const width = pier ? .93 : .6;
    paint(pier ? stone : siding, () => body.box(width, 5.15 - foot, width, u, (5.15 + foot) / 2, 28.7, pier ? masonry : white));
  }
  facade([15.9, 22.5], [8.55, 22.5], .26, 4.6, 1, 2.45, .76, .85, windows, .65);
  body.box(.86, 6.85, 1.1, -21.05, 5.9, 14.4, masonry);

  // Two narrow veranda levels run along the course-facing edge.
  for (const y of [-2.9, .28, 3.35]) {
    body.box(29, .23, 2.8, -11.8, y, -14.55, white);
    if (y < 3) body.box(29, .15, .13, -11.8, y + .92, -15.84, white);
  }
  for (let u = -25.8; u <= 2.6; u += 3.55) {
    body.box(.37, 6.55, .37, u, .15, -15.78, white);
  }
  return shell.finish('#edc99b', .33);
}

/** The pool is a separate, ground-registered landscape mesh beside the shell. */
export function ansleyClubPool(ground: DrapeGround) {
  const y = ground(...world(2, -40));
  if (y === null) return null;
  const map = (ring: P2[]) => ring.map(([u, v]) => world(u, v));
  const pool = map([[-8.3, -49.8], [-8.3, -28.3], [14.8, -30], [15.5, -52.2]]);
  const apron = map([[-13.3, -54.5], [-12.8, -24.1], [19.5, -25.1], [20.2, -57.4]]);
  const b = new Builder();
  const drawn = ground.triangles;
  const paving = (a: number[], c: number[], d: number[]) => b.tri(a, c, d, '#c6bca7');
  drapeRing(apron, 2, (x, z) => (ground(x, z) ?? y) + .12,
    (a, c, d) => { if (drawn) drapeTriangle(drawn, a, c, d, .12, paving); else paving(a, c, d); }, [pool]);
  const top = Math.max(...pool.map(([x, z]) => ground(x, z) ?? y)) + .13;
  const [a, c, d, e] = pool;
  const vertex = ([x, z]: P2) => [x, top, z];
  b.quad(vertex(a), vertex(c), vertex(d), vertex(e), '#509797');
  for (const [i, a] of pool.entries()) {
    const next = pool[(i + 1) % pool.length];
    const bed = ([x, z]: P2) => [x, ground(x, z) ?? y, z];
    b.quad(vertex(a), vertex(next), bed(next), bed(a), '#b9b39e');
  }
  const mesh = landscapeMesh(b);
  mesh.mesh.name = 'Ansley clubhouse pool';
  return mesh;
}
