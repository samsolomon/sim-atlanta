import { surfaces } from '../materials';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litFacade, seedOf } from './skin-kit';

const id = 'c2886eef-1a96-49f6-b58b-bcf297d0cee6';
const axis: P2 = [0.753, 0.658];
const brick = '#76645e';
const concrete = '#c6c2b6';
const roofColor = '#787673';
const glass = ['#87939d', '#939ba2'];

const slab = (west: number, east: number, northeast: number, southwest: number): P2[] => [
  [west, northeast], [east, northeast], [east, southwest], [west, southwest],
];

// The two low cores are part of the annex. Five tall cores break up the tower faces.
const cores = [
  [-42.22, 12.53, 327.4], [-42.76, -15.01, 327.4],
  [-16.33, 12.47, 358.9], [-16.28, -15.10, 360.5],
  [10.53, -15.11, 358.8], [37.91, -15.11, 358.9], [38.32, 12.40, 358.9],
];

export function createUrbanLifeBuilding(buildings: VBuilding[], grid: GroundGrid) {
  const shell = landmarkShell(buildings, grid, id, 'Urban Life Building', [577, 190], axis,
    [[-35, 0], [0, 0], [30, 0], [12, 16]]);
  if (!shell) return null;

  const masonry = surfaces.brick({ darkJoints: true });
  const roof = surfaces.asphaltRoof();
  const precast = surfaces.precast({ strength: 0.45 });
  const seed = seedOf(id);
  const courtyardWing: P2[] = [
    [-46.65, -15.6], [-42.47, -15.6], [-42.47, -10.05], [-15.96, -10.05],
    [-15.96, 6.24], [-42.4, 6.24], [-42.45, 10.82], [-46.63, 10.82], [-46.18, -0.3],
  ];
  const tower = slab(-16.07, 38.02, -14.39, 11.8);
  const entry = slab(1.58, 21.5, 11.65, 19.65);
  const terraceLo = 327.4;
  const terraceHi = 331.18;
  shell.prism(courtyardWing, shell.base, 326.3, brick, roofColor, { wall: masonry, roof });
  shell.prism(entry, shell.base, 321.6, concrete, roofColor, { wall: precast, roof });
  shell.prism(tower, shell.base, terraceLo, brick, roofColor, { wall: masonry });
  shell.prism(slab(-14.8, 36.8, -13.15, 10.55), terraceLo - 0.05, terraceHi + 0.05, '#625a54', roofColor);
  shell.prism(tower, terraceHi, 357.8, brick, roofColor, { wall: masonry, roof });
  shell.prism(slab(6, 15.9, -8, -0.3), 357.75, 362.1, brick, roofColor, { wall: masonry, roof });

  for (const [x, z, top] of cores) {
    const plan: P2[] = Array.from({ length: 14 }, (_, i) => {
      const angle = i * 2 * Math.PI / 14;
      return [x + Math.cos(angle) * 3.02, z + Math.sin(angle) * 3.02];
    });
    shell.prism(plan, shell.base, top, brick, roofColor, { wall: masonry, roof });
  }

  faces(tower, (a, b, length, face) => {
    const bays = Math.round(length / (face % 2 === 0 ? 5.4 : 6.6));
    const pitch = length / bays;
    const point = (u: number, y: number, out: number) => {
      const [x, z] = along(a, b, length, u, out);
      return [x, y, z];
    };
    const band = (y: number, height: number) => {
      shell.body.quad(point(0, y, 0.13), point(0, y + height, 0.13),
        point(length, y + height, 0.13), point(length, y, 0.13), concrete);
    };

    band(315.4, 0.72);
    band(319.35, 0.66);
    band(323.4, 0.66);
    band(326.77, 0.63);
    for (let floor = 0; floor < 8; floor++) band(terraceHi + floor * 3.27, 0.55);
    band(357.25, 0.55);

    for (let bay = 0; bay < bays; bay++) {
      const u = bay * pitch + 0.48;
      shell.body.quad(point(u, 315.4, 0.18), point(u, 357.25, 0.18),
        point(u + 0.39, 357.25, 0.18), point(u + 0.39, 315.4, 0.18), concrete);
      // The supporting concrete posts remain visible across the recessed terrace.
      const l = u + 0.02;
      const r = u + 0.36;
      const column = [along(a, b, length, l, 0.12), along(a, b, length, r, 0.12),
        along(a, b, length, r, -1.31), along(a, b, length, l, -1.31)];
      shell.prism(column, terraceLo - 0.05, terraceHi + 0.05, concrete, concrete);
    }
    // Small vertical slots stay within each brick panel. The recessed terrace stays open.
    const start = along(a, b, length, -pitch * 0.22);
    const end = along(a, b, length, length - pitch * 0.22);
    litFacade(shell, seed, face, start, end, 316.1, 326.6, 3, pitch, 0.115, 0.70, glass, 0.14);
    litFacade(shell, seed, 16 + face, start, end, terraceHi + 0.63, 357.22, 8, pitch, 0.115, 0.82, glass, 0.1);
    litFacade(shell, seed, 32 + face, a, b, 310, 315.1, 1, 3.25, 0.64, 0.64, glass, 0.25);
  });
  faces(entry, (a, b, _length, face) => {
    litFacade(shell, seed, 48 + face, a, b, 313.6, 320.5, 1, 3.1, 0.75, 0.67, glass, 0.25);
  });

  return shell.finish('#eed8bb', 0.43);
}
