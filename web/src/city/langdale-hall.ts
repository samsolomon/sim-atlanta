import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litFacade, seedOf, wound } from './skin-kit';

export const langdaleHallId = '948a44ff-43db-4085-9b23-63a966006ca8';

const origin: P2 = [411, 74];
const ground = 313, roof = ground + 42, crown = roof - 10.2;
const concrete = '#d3cfc5', brick = '#776762', glazing = ['#849198', '#8e989c'];
const seed = seedOf(langdaleHallId);

/** The brick classroom wings and the concrete-framed Greenway end. See docs/log/ui/langdale-hall. */
export function createLangdaleHall(buildings: VBuilding[], grid: GroundGrid) {
  const shell = landmarkShell(buildings, grid, langdaleHallId, 'Langdale Hall', origin, [1, 0], [[0, 0]]);
  if (!shell) return null;
  const ring = wound(shell.ring, 1);
  shell.prism(ring, shell.base, roof, concrete, '#97938c');
  // Estimated central plant enclosure, aligned to the long wall.
  const penthouse: P2[] = [[-9, 5], [2, -8], [9, -2], [-2, 11]];
  shell.prism(penthouse, roof, ground + 47, '#aaa79e', '#918e86');

  faces(ring, (a, b, length, face) => {
    const plaza = length > 40 && b[1] > a[1];
    const lower = Math.min(...[a, b].map(([x, z]) => grid.sample(origin[0] + x, origin[1] + z)!));
    function panel(left: number, right: number, bottom: number, top: number, colour: string) {
      const [x, z] = along(a, b, length, left, 0.06);
      const [u, v] = along(a, b, length, right, 0.06);
      shell!.body.quad([x, bottom, z], [x, top, z], [u, top, v], [u, bottom, v], colour);
    }
    const end = length < 27 && length > 18;
    const bays = Math.max(1, Math.round(length / (end ? 6.5 : 8)));
    const pitch = length / bays;
    for (let bay = 0; bay < bays; bay++) {
      const left = bay * pitch, right = left + pitch;
      if (end) {
        const sill = ground + 4;
        panel(left + 0.18, right - 0.18, lower, sill - 0.2, glazing[0]);
        for (let row = 0; row < 7; row++) {
          const step = (crown - sill) / 7;
          panel(left + 0.18, right - 0.18, sill + row * step, sill + (row + 1) * step - 0.32, brick);
        }
      } else {
        const entrance = plaza && bay === Math.floor(bays / 2);
        panel(left + pitch * 0.2, right - pitch * 0.2, entrance ? ground + 4 : lower, crown - 0.45, brick);
        if (entrance) panel(left + pitch * 0.2, right - pitch * 0.2, lower, ground + 3.65, glazing[0]);
        // Narrow paired window stacks alternate with the broad brick panels.
        for (const fraction of [0.08, 0.92]) {
          const start = along(a, b, length, left + pitch * (fraction - 0.045));
          const finish = along(a, b, length, left + pitch * (fraction + 0.045));
          litFacade(shell!, seed, face * 100 + bay * 2 + Number(fraction > 0.5), start, finish,
            lower + 0.3, crown - 0.4, 8, pitch, 1, 0.72, glazing, 0.14);
        }
      }
    }
    const inset = end ? length * 0.18 : 0.3;
    litFacade(shell, seed, face, along(a, b, length, inset), along(a, b, length, length - inset),
      crown, roof - 0.5, 3, 1.95, 0.78, 0.74, glazing, 0.2);
  });
  return shell.finish('#ead4ae', 0.46);
}
