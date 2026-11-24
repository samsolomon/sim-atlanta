import { surfaces } from '../materials';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, litHash, seedOf, wound } from './skin-kit';

// Emory's four-storey faculty building at Armstrong and Jesse Hill. See docs/emory-faculty-office.md.
export const emoryFacultyOfficeId = '806a6dd9-0ea5-47e1-a6ab-99d9c062da89';
const ORIGIN: P2 = [858.17, 90.02];
const AXIS: P2 = [26.44, 23.15];
const ROOF = 321.6, CORNICE = 322.05, PLANT = 326.0, HEADHOUSE = 329.0;
const BRICK = '#9a7967', BASE = '#a69479', STONE = '#bcb8ac', FRAME = '#c6c8bd';
const GLASS = ['#7e8e97', '#819099', '#85929a'];
const brick = surfaces.brick({ strength: 0.65 });
const stone = surfaces.limestone({ strength: 0.45 });
const seed = seedOf(emoryFacultyOfficeId);

const rect = (x0: number, z0: number, x1: number, z1: number): P2[] =>
  [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

export function createEmoryFacultyOffice(buildings: VBuilding[], grid: GroundGrid) {
  const shell = landmarkShell(buildings, grid, emoryFacultyOfficeId, 'Emory Faculty Office Building',
    ORIGIN, AXIS, [[17, -20], [4, -12], [16, -37], [30, -7]]);
  if (!shell) return null;
  const { body, lights, prism } = shell;
  const plan = wound(shell.ring, 1);
  prism(plan, shell.base, 307.95, BASE, BASE, { wall: brick });
  prism(plan, 307.95, ROOF, BRICK, '#666663', { wall: brick });
  prism(rect(0.55, -39.3, 18.3, -6.0), ROOF, PLANT, '#8d8172', '#7d7b73', { wall: brick });
  prism(rect(0.65, -17.6, 9.2, -7.3), PLANT, HEADHOUSE, '#9d9385', '#807e75');

  for (let face = 0; face < plan.length; face++) {
    const a = plan[face], b = plan[(face + 1) % plan.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const point = (u: number, y: number, out: number) => {
      const [x, z] = along(a, b, length, u, out);
      return [x, y, z];
    };
    const panel = (target: typeof body, u0: number, u1: number, y0: number, y1: number, out: number, colour: string) => {
      target.quad(point(u0, y0, out), point(u0, y1, out), point(u1, y1, out), point(u1, y0, out), colour);
    };
    // Raised stone belt courses, with a continuous dark coping above the top row.
    shell.paint(stone, () => {
      for (const [lo, hi] of [[304.9, 305.05], [306.5, 306.63], [307.85, 308.12], [317.55, 318.25]]) {
        panel(body, 0, length, lo, hi, 0.06, STONE);
      }
      panel(body, 0, length, 321.35, CORNICE, 0.13, STONE);
    });
    panel(body, 0, length, CORNICE, CORNICE + 0.13, 0.13, '#797568');

    // Full-width southwest Armstrong facade and the long Jesse Hill frontage.
    const mid = along(a, b, length, length / 2);
    const armstrong = Math.abs(mid[1]) < 0.4;
    const jesseHill = mid[0] > 34 && length > 20;
    if (length < 6) continue;
    const count = Math.round(length / 3.9);
    const archBay = armstrong || jesseHill ? Math.floor(count / 2) : -1;
    const rows = [[304.65, 307.65], [308.48, 311.95], [313.25, 316.9], [318.55, 321.05]];
    const width = 1.58;

    for (let row = 0; row < rows.length; row++) {
      const [lo, hi] = rows[row];
      for (let bay = 0; bay < count; bay++) {
        if (bay === archBay && (row <= 1 || (jesseHill && row === 2))) continue;
        const u = (bay + 0.5) * length / count;
        const target = litHash(seed, face, row, bay) < 0.16 ? lights : body;
        const tone = Math.floor(3 * litHash(seed, face, row, bay + 4096));
        const l = u - width / 2, r = u + width / 2;
        panel(body, l - 0.10, r + 0.10, lo - 0.1, hi + 0.10, 0.12, FRAME);
        panel(target, l, r, lo, hi, 0.18, GLASS[tone]);
        panel(body, u - 0.035, u + 0.035, lo, hi, 0.24, FRAME);
        const panes = row === 0 || row === 3 ? 3 : 4;
        for (let mullion = 1; mullion < panes; mullion++) {
          const y = lo + mullion * (hi - lo) / panes;
          panel(body, l, r, y - 0.032, y + 0.032, 0.24, FRAME);
        }
      }
    }

    if (archBay < 0) continue;
    const u = (archBay + 0.5) * length / count;
    const radius = jesseHill ? 1.42 : 1.19, shoulder = jesseHill ? 315.48 : 311.0;
    const sill = Math.max(shell.base, 304.2);
    panel(body, u - radius - 0.22, u + radius + 0.22, sill, shoulder, 0.12, STONE);
    const archFill = armstrong ? GLASS[0] : '#9c8e79';
    const archSurface = armstrong ? lights : body;
    panel(archSurface, u - radius, u + radius, sill, shoulder, 0.18, archFill);
    for (let i = 0; i < 10; i++) {
      const p0 = Math.PI * i / 10, p1 = Math.PI * (i + 1) / 10;
      const at = (angle: number, r: number, offset: number) =>
        point(u + r * Math.cos(angle), shoulder + r * Math.sin(angle), offset);
      body.quad(at(p1, radius, 0.12), at(p1, radius + 0.22, 0.12),
        at(p0, radius + 0.22, 0.12), at(p0, radius, 0.12), STONE);
      archSurface.tri(point(u, shoulder, 0.18), at(p1, radius, 0.18), at(p0, radius, 0.18), archFill);
    }
    if (jesseHill) {
      panel(lights, u - 0.84, u + 0.84, sill, 307.15, 0.24, GLASS[1]);
      continue;
    }
    for (const level of [307.2, 309.3]) {
      panel(body, u - radius, u + radius, level - 0.09, level + 0.09, 0.24, FRAME);
    }
    panel(body, u - 0.07, u + 0.07, sill, shoulder + radius * 0.94, 0.24, FRAME);
  }

  const result = shell.finish('#ffe2bf', 0.42);
  result.group.userData.footprint = { top: HEADHOUSE + 0.02 - grid.manifest.vertical.sceneZeroNavd88M };
  return result;
}
