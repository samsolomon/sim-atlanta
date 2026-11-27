import { AdditiveBlending, Color, DoubleSide, Mesh, MeshBasicMaterial } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, type P2 } from '../vignette/geom';
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
 * round sign on a message board atop a mast. The sign carries a generic advertisement: a few bold
 * blocks of colour, with no words, logos or real brand. Its face is lit at night, and so are the
 * offices: both glow through one night-only additive overlay, so the building has no lamp mesh.
 */
export function createOlympia(buildings: VBuilding[], grid: GroundGrid) {
  const site = buildings.find(b => b.id === olympiaId);
  if (!site || site.rings.length !== 1) return null;
  const shell = landmarkShell(buildings, grid, olympiaId, 'Olympia Building', origin, [1, 0], [[0, -2], [-20, -6], [15, -8]]);
  if (!shell) return null;
  const seed = seedOf(olympiaId);
  let face = 0;
  // Night glow. Lit panes stay in the batched body by day and add their light through `glow` at
  // night, as a lamp mesh would (warm white at 0.75), without a lamp draw of their own.
  const glow = new Builder();
  const paneGlow = new Color('#f7ecd8').multiplyScalar(0.75);
  const lit = {
    body: shell.body,
    lights: { quad(a: number[], b: number[], c: number[], d: number[], color: string) {
      shell.body.quad(a, b, c, d, color);
      glow.quad(a, b, c, d, paneGlow);
    } } as unknown as typeof shell.lights,
  };
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
    shell.body.quad(out(0, datum, 0.035), out(0, shop, 0.035), out(1, shop, 0.035), out(1, datum, 0.035), storeBand);
    litFacade(lit, seed, face++, a, b, datum + 0.4, shop - 0.5, 1, 3.6, 0.82, 0.86, storefront, 0.5);
    // The stone storey: large green-tinted windows in a regular rhythm, and a cornice.
    litFacade(lit, seed, face++, a, b, shop + 0.6, stoneTop - 0.7, 1, 2.6, 0.58, 0.72, windows, 0.1);
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
  edges(top, (a, b) => litFacade(lit, seed, face++, a, b, stoneTop + 0.2, roof - 0.3, 1, 1.8, 0.92, 0.85, upper, 0.1));

  // The rooftop sign: a mast, a message board, and a 10 m disc on top, facing up and down
  // Peachtree (normals along ±z), framed dark. Both faces carry the same generic ad, a few bold
  // colour blocks that read as an advertisement from the street: a cream headline bar and two
  // panels on a blue disc, and a blue copy bar on a yellow board. No words, logos or brand colours.
  const [sx, sz] = signAt;
  const mastTop = datum + 15, boardTop = datum + 17.6, discMid = datum + 22, discR = 5, faceR = discR - 0.35;
  // The mast stays inside the board's 0.4 m half-depth, behind both faces' artwork (0.42 m out).
  shell.prism(ccw([[sx - 0.35, sz - 0.35], [sx + 0.35, sz - 0.35], [sx + 0.35, sz + 0.35], [sx - 0.35, sz + 0.35]]), roof - 0.5, discMid, '#4a4e51', '#4a4e51');
  shell.prism(ccw([[sx - 3.2, sz - 0.4], [sx + 3.2, sz - 0.4], [sx + 3.2, sz + 0.4], [sx - 3.2, sz + 0.4]]), mastTop, boardTop, '#3c4043', '#3c4043');
  const blue = '#1f4e8c', cream = '#f3efe4', yellow = '#f2b62e', orange = '#e2702f', teal = '#2a9d8f', frame = '#3c4043';
  // Floodlit at night: each face colour glows back at about its daylight value.
  const lamp = (color: string) => new Color(color).multiplyScalar(0.85);
  for (const side of [-1, 1]) {
    // Background at 0.42 m from the sign's mid-plane, blocks 3 cm in front of it.
    const at = (d: number) => sz + side * d;
    const q = (x0: number, y0: number, x1: number, y1: number, d: number, color: string) => {
      const z = at(d);
      const corners: number[][] = side > 0
        ? [[x0, y0, z], [x0, y1, z], [x1, y1, z], [x1, y0, z]]
        : [[x1, y0, z], [x1, y1, z], [x0, y1, z], [x0, y0, z]];
      shell.body.quad(corners[0], corners[1], corners[2], corners[3], color);
      glow.quad(corners[0], corners[1], corners[2], corners[3], lamp(color));
    };
    // The message board: yellow, with a long blue copy bar and a short cream one.
    q(sx - 2.9, mastTop + 0.3, sx + 2.9, boardTop - 0.3, 0.42, yellow);
    q(sx - 2.5, mastTop + 1.1, sx + 1.2, boardTop - 0.65, 0.45, blue);
    q(sx + 1.6, mastTop + 1.1, sx + 2.5, boardTop - 0.65, 0.45, cream);
    // The disc: a dark rim and a blue face, both two-sided via the two windings.
    const n = 20, z = at(0.42);
    const rim = (r: number, a: number): number[] => [sx + Math.cos(a) * r, discMid + Math.sin(a) * r, z];
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      const c = [sx, discMid, z];
      if (side > 0) {
        shell.body.tri(c, rim(faceR, a1), rim(faceR, a0), blue);
        glow.tri(c, rim(faceR, a1), rim(faceR, a0), lamp(blue));
        shell.body.quad(rim(faceR, a0), rim(faceR, a1), rim(discR, a1), rim(discR, a0), frame);
      } else {
        shell.body.tri(c, rim(faceR, a0), rim(faceR, a1), blue);
        glow.tri(c, rim(faceR, a0), rim(faceR, a1), lamp(blue));
        shell.body.quad(rim(faceR, a1), rim(faceR, a0), rim(discR, a0), rim(discR, a1), frame);
      }
    }
    // Blocks inside the face (every corner within 4.4 m of the centre): a cream headline bar
    // across the top, then a yellow panel and an orange one, with a teal strip along the foot.
    q(sx - 3.7, discMid + 0.7, sx + 3.7, discMid + 2.0, 0.45, cream);
    q(sx - 3.4, discMid - 2.4, sx + 0.3, discMid + 0.2, 0.45, yellow);
    q(sx + 0.8, discMid - 2.4, sx + 3.4, discMid + 0.2, 0.45, orange);
    q(sx - 2.4, discMid - 3.6, sx + 2.4, discMid - 2.9, 0.45, teal);
  }
  // The shell has no lamp mesh: every lit pane went to `glow`. The overlay matches the Capitol's
  // and City Hall's night material (one shared program), pulled forward of the faces it lights.
  const model = shell.finish();
  const material = new MeshBasicMaterial({
    vertexColors: true,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    // One pass: a transparent double-sided material otherwise draws twice (back, then front).
    forceSinglePass: true,
    opacity: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const night = new Mesh(glow.geometry(), material);
  night.name = 'Olympia sign and office glow';
  night.visible = false;
  model.group.add(night);
  return {
    ...model,
    setNight(n: number) {
      material.opacity = n;
      night.visible = n > 0.001;
    },
  };
}
