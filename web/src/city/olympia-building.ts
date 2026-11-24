import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const olympiaId = 'd1c4e582-4bcf-4986-a2df-0d0e675ea41a';
const origin: P2 = [208, -47];
// The rooftop sign's mast at the west (Five Points) corner, where the lidar reads 27 m.
const signAt: P2 = [-21.5, -5.5];

/**
 * The Olympia Building (Ivey & Crook, 1935–36) on the Five Points corner of Peachtree, Edgewood
 * and Decatur. Heights from the April 2019 lidar (ground 318.5 m NAVD88): the building is about
 * 10.5 m, two stone storeys with a set-back glazed top floor; the mapped 27.5 m is the rooftop
 * sign, whose top the lidar puts at 27 m. Photographs (Wikimedia Commons) show pale stone walls
 * with large green-tinted windows, a dark storefront band, a set-back green-glass top floor, and the
 * round sign on a message board atop a mast. The sign is drawn as a blank neutral panel: no
 * wordmark, script or brand colour. Its face is neon-lit, so it glows at night.
 */
export function createOlympia(buildings: VBuilding[], grid: GroundGrid) {
  const site = buildings.find(b => b.id === olympiaId);
  if (!site || site.rings.length !== 1) return null;
  const shell = landmarkShell(buildings, grid, olympiaId, 'Olympia Building', origin, [1, 0], [[0, -2], [-20, -6], [15, -8]]);
  if (!shell) return null;
  const seed = seedOf(olympiaId);
  let face = 0;
  const ccw = (ring: P2[]): P2[] => {
    const area = ring.reduce((sum, [x, z], i) => {
      const [nx, nz] = ring[(i + 1) % ring.length];
      return sum + x * nz - nx * z;
    }, 0);
    return area < 0 ? [...ring].reverse() : ring;
  };
  const edges = (ring: P2[], draw: (a: P2, b: P2, length: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length > 1) draw(a, b, length);
    });
  const datum = shell.base + 0.35;
  const shop = datum + 4.6, stoneTop = datum + 8.6, roof = datum + 11;
  const stone = '#e3dccb', trim = '#ece6d8', storeBand = '#3a3f42', roofColor = '#a9a69d';
  const windows = ['#7f9a8e', '#86a094'];
  const storefront = ['#5f7a80', '#66818a'];
  const upper = ['#7fa596', '#86ab9c'];

  const plan = ccw(shell.ring);
  shell.prism(plan, shell.base, stoneTop, stone, roofColor);
  edges(plan, (a, b, length) => {
    const out = (t: number, y: number, d: number): [number, number, number] =>
      [a[0] + t * (b[0] - a[0]) + d * (b[1] - a[1]) / length, y, a[1] + t * (b[1] - a[1]) - d * (b[0] - a[0]) / length];
    // Dark storefront band with shop glass.
    shell.body.quad(out(0, datum, 0.04), out(0, shop, 0.04), out(1, shop, 0.04), out(1, datum, 0.04), storeBand);
    litFacade(shell, seed, face++, a, b, datum + 0.4, shop - 0.5, 1, 3.6, 0.82, 0.86, storefront, 0.5);
    // The stone storey: large green-tinted windows in a regular rhythm, and a cornice.
    litFacade(shell, seed, face++, a, b, shop + 0.6, stoneTop - 0.7, 1, 2.6, 0.58, 0.72, windows, 0.1);
    shell.body.quad(out(0, stoneTop - 0.35, 0.12), out(0, stoneTop, 0.12), out(1, stoneTop, 0.12), out(1, stoneTop - 0.35, 0.12), trim);
  });
  // Set-back green-glass top floor.
  const inset = (ring: P2[], d: number): P2[] => {
    const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return ring.map(([x, z]): P2 => {
      const dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz);
      return [x - dx / l * d, z - dz / l * d];
    });
  };
  const top = inset(plan, 1.6);
  shell.prism(top, stoneTop, roof, stone, roofColor);
  edges(top, (a, b) => litFacade(shell, seed, face++, a, b, stoneTop + 0.2, roof - 0.3, 1, 1.8, 0.92, 0.85, upper, 0.1));

  // The rooftop sign: a mast, a message board, and a 10 m disc on top, facing up and down
  // Peachtree (normals along ±z). Blank neutral panels, framed dark; the faces go on the lamp mesh.
  const [sx, sz] = signAt;
  const mastTop = datum + 15, boardTop = datum + 17.6, discMid = datum + 22, discR = 5;
  shell.prism(ccw([[sx - 0.6, sz - 0.6], [sx + 0.6, sz - 0.6], [sx + 0.6, sz + 0.6], [sx - 0.6, sz + 0.6]]), roof - 0.5, discMid, '#4a4e51', '#4a4e51');
  shell.prism(ccw([[sx - 3.2, sz - 0.4], [sx + 3.2, sz - 0.4], [sx + 3.2, sz + 0.4], [sx - 3.2, sz + 0.4]]), mastTop, boardTop, '#3c4043', '#3c4043');
  const panel = '#f1ece0';
  for (const side of [-1, 1]) {
    const z = sz + side * 0.42;
    const q = (x0: number, y0: number, x1: number, y1: number) => side > 0
      ? shell.lights.quad([x0, y0, z], [x0, y1, z], [x1, y1, z], [x1, y0, z], panel)
      : shell.lights.quad([x1, y0, z], [x1, y1, z], [x0, y1, z], [x0, y0, z], panel);
    q(sx - 2.9, mastTop + 0.3, sx + 2.9, boardTop - 0.3);
    // The disc: a ring of dark rim and a pale face, both two-sided via the two windings.
    const n = 20;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      const rim = (r: number, a: number): [number, number, number] => [sx + Math.cos(a) * r, discMid + Math.sin(a) * r, z];
      const c: [number, number, number] = [sx, discMid, z];
      if (side > 0) {
        shell.lights.tri(c, rim(discR - 0.35, a1), rim(discR - 0.35, a0), panel);
        shell.body.quad(rim(discR - 0.35, a0), rim(discR - 0.35, a1), rim(discR, a1), rim(discR, a0), '#3c4043');
      } else {
        shell.lights.tri(c, rim(discR - 0.35, a0), rim(discR - 0.35, a1), panel);
        shell.body.quad(rim(discR - 0.35, a1), rim(discR - 0.35, a0), rim(discR, a0), rim(discR, a1), '#3c4043');
      }
    }
  }
  return shell.finish('#f7ecd8', 0.75);
}
