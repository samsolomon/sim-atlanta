import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litFacade, outwardSign, seedOf, wound } from './skin-kit';

export const regionsPlazaId = 'osm:way:269843399';
const origin: P2 = [303.9, -3678.6];

// Regions Plaza (1180 West Peachtree, 2001): a square granite-and-glass office tower with notched
// corners, an arched top storey and a truncated hip roof. Heights are the April 2019 lidar per
// mapped part: notched corners 84.4 m, main parapet 96.8 m, hip roof flat at about 104 m.
const W = 24.8, D = 21.8; // half-widths of the plan (x east, z south) about the origin
const notchX = 10.1, notchZ = 7.4; // the corner notches, from the mapped corner parts
const corner = 84.4, parapet = 96.8, hipTop = 104, rail = 105.2;
const base = 9.2; // two-storey granite base
const storeys = 20, storey = (corner - base) / storeys;

const stone = '#dcc3ae', stoneShade = '#c9ae98', band = '#e6d2c0'; // warm and light, so piers hold in shade
// Glass base #737c86: HSV saturation 14%, value 53%, near-neutral as the glass rules ask for dark
// glass. The photographs read darker; at 11:30 it renders about V 44% where sunlit.
const glass = ['#737c86', '#707983', '#76808a'];
const roofMetal = '#8f877b';

export function createRegionsPlaza(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const shell = landmarkShell(buildings, grid, site.id, 'Regions Plaza', origin, [1, 0], [[0, 0], [-20, -18], [20, 18]]);
  if (!shell) return null;
  const floor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const footing = Math.min(floor, shell.base) - 0.65;
  const { body, lights } = shell;
  const seed = seedOf(site.id);

  const box: P2[] = wound([[-W, -D], [W, -D], [W, D], [-W, D]], 1);
  // The cross: the box with its four corners notched out above the corner roofs.
  const cross: P2[] = wound([
    [-W + notchX, -D], [W - notchX, -D], [W - notchX, -D + notchZ], [W, -D + notchZ],
    [W, D - notchZ], [W - notchX, D - notchZ], [W - notchX, D], [-W + notchX, D],
    [-W + notchX, D - notchZ], [-W, D - notchZ], [-W, -D + notchZ], [-W + notchX, -D + notchZ],
  ], 1);
  const out = outwardSign(box);

  shell.prism(box, footing, floor + corner, stone, stoneShade);
  shell.prism(cross, floor + corner, floor + parapet, stone, stoneShade);

  // The shaft: paired dark windows between granite piers, a heavier band every third storey.
  faces(box, (a, b, length, face) => {
    litFacade(shell, seed, face, along(a, b, length, 0, 0), along(a, b, length, length, 0),
      floor + base, floor + corner, storeys, 3.4, 0.66, 0.78, glass, 0.09);
    const p = along(a, b, length, -0.3, 0.25 * out), q = along(a, b, length, length + 0.3, 0.25 * out);
    for (let k = 0; k <= storeys; k += 3) {
      const y = floor + base + k * storey - 0.35;
      body.quad([p[0], y, p[1]], [p[0], y + 0.7, p[1]], [q[0], y + 0.7, q[1]], [q[0], y, q[1]], band);
    }
    // Base: tall two-storey openings, and the arched entrance at the middle of each face.
    litFacade(shell, seed, face + 8, along(a, b, length, 0, 0), along(a, b, length, length, 0),
      floor + 0.6, floor + base - 1.2, 1, 4.2, 0.5, 0.86, glass, 0.6);
    const m0 = along(a, b, length, length / 2 - 2.4, 0.1 * out), m1 = along(a, b, length, length / 2 + 2.4, 0.1 * out);
    const top = along(a, b, length, length / 2, 0.1 * out);
    lights.quad([m0[0], footing, m0[1]], [m0[0], floor + 7, m0[1]], [m1[0], floor + 7, m1[1]], [m1[0], footing, m1[1]], glass[0]);
    lights.tri([m0[0], floor + 7, m0[1]], [top[0], floor + 9.2, top[1]], [m1[0], floor + 7, m1[1]], glass[0]);
  });
  // The arched top storey on the cross: tall round-headed windows, lit by the crown wash at night.
  faces(cross, (a, b, length, face) => {
    if (length < 8) return;
    const count = Math.round(length / 3.4);
    for (let k = 0; k < count; k++) {
      const u = (k + 0.5) * length / count;
      const p = along(a, b, length, u - 0.75, 0.06 * out), q = along(a, b, length, u + 0.75, 0.06 * out), c = along(a, b, length, u, 0.06 * out);
      const y0 = floor + corner + 2.4, y1 = floor + parapet - 3.4;
      const target = (k + face) % 2 ? lights : body;
      target.quad([p[0], y0, p[1]], [p[0], y1, p[1]], [q[0], y1, q[1]], [q[0], y0, q[1]], glass[1]);
      target.tri([p[0], y1, p[1]], [c[0], y1 + 0.9, c[1]], [q[0], y1, q[1]], glass[1]);
    }
  });
  // Pinnacles at the notched corners of the cross.
  cross.forEach(([x, z]) => {
    const r = 0.7, y0 = floor + parapet, y1 = y0 + 2.6;
    shell.prism([[x - r, z - r], [x + r, z - r], [x + r, z + r], [x - r, z + r]].map(([px, pz]): P2 => [px - Math.sign(x) * r, pz - Math.sign(z) * r]), y0, y1, band, band);
  });

  // The truncated hip roof: four slopes up to a flat deck with a rail. The metal is in the lamp
  // mesh so the floodlit crown glows as one even surface at night.
  const r0: P2[] = [[-W + 4.2, -D + 4.2], [W - 4.2, -D + 4.2], [W - 4.2, D - 4.2], [-W + 4.2, D - 4.2]];
  const r1: P2[] = [[-12, -9.1], [12, -9.1], [12, 9.1], [-12, 9.1]];
  shell.prism(r0, floor + parapet - 0.2, floor + parapet, stoneShade, stoneShade);
  for (let i = 0; i < 4; i++) {
    const a0 = r0[i], b0 = r0[(i + 1) % 4], a1 = r1[i], b1 = r1[(i + 1) % 4];
    const y0 = floor + parapet, y1 = floor + hipTop;
    lights.quad([a0[0], y0, a0[1]], [a1[0], y1, a1[1]], [b1[0], y1, b1[1]], [b0[0], y0, b0[1]], roofMetal);
  }
  lights.quad([r1[0][0], floor + hipTop, r1[0][1]], [r1[3][0], floor + hipTop, r1[3][1]], [r1[2][0], floor + hipTop, r1[2][1]], [r1[1][0], floor + hipTop, r1[1][1]], '#7c776f');
  faces(r1, (a, b) => {
    body.quad([a[0], floor + hipTop, a[1]], [a[0], floor + rail, a[1]], [b[0], floor + rail, b[1]], [b[0], floor + hipTop, b[1]], band);
  });
  return shell.finish('#f4dcb4', 0.55);
}
