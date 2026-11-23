import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import { classicalOrnament } from './classical-ornament';
import sites from './fixtures/midtown-skyline.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// The Academy of Medicine (Hentz, Adler & Shutze, 1941): a cream stucco
// temple on a raised base. A six-column pedimented portico faces West
// Peachtree (local -x), copper hipped roofs cover the wings, a square
// lantern with arched thermal windows rises over the centre, and tall
// arched windows sit in blind arches. Origin (451, -2720), x east.
const stucco = '#e8dec8', base = '#d9cdb4', trim = '#f1ead9', copper = '#7fae9c', shade = '#a99c86';

export function academyOfMedicine(shell: Shell) {
  const { band, modillions } = classicalOrnament(shell, { stone: trim, shade, limestone: base, joint: shade });
  const ring = shell.ring.reduce((s, [x, z], i) => { const [a, b] = shell.ring[(i + 1) % shell.ring.length]; return s + x * b - z * a; }, 0) < 0
    ? [...shell.ring].reverse() : shell.ring;
  const PLINTH = 1.6, EAVE = 8.4;
  shell.prism(ring, shell.base, PLINTH, base, base);
  shell.prism(ring, PLINTH, EAVE, stucco, stucco);
  band(ring, PLINTH - .25, PLINTH, .15, trim);
  band(ring, EAVE - .5, EAVE - .2, .2, trim);
  modillions(ring, EAVE - .2, EAVE + .05, .45, 1.1, .22);
  band(ring, EAVE + .05, EAVE + .45, .55, trim);

  // Copper hipped roofs over the north and south wings and the rear.
  const hip = (x0: number, x1: number, z0: number, z1: number, rise: number) => {
    const y = EAVE + .45, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rx = (x1 - x0) / 2, rz = (z1 - z0) / 2;
    const ridge = rx > rz ? [[cx - rx + rz, cz], [cx + rx - rz, cz]] : [[cx, cz - rz + rx], [cx, cz + rz - rx]];
    const [a, b] = ridge.map(([x, z]) => [x, y + rise, z]);
    const c = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
    if (rx > rz) {
      shell.body.quad(c[0], c[1], b, a, copper); shell.body.quad(c[2], c[3], a, b, copper);
      shell.body.tri(c[1], c[2], b, copper); shell.body.tri(c[3], c[0], a, copper);
    } else {
      shell.body.quad(c[1], c[2], b, a, copper); shell.body.quad(c[3], c[0], a, b, copper);
      shell.body.tri(c[0], c[1], a, copper); shell.body.tri(c[2], c[3], b, copper);
    }
  };
  hip(-13.5, 6, 6.5, 19.5, 2.6);
  hip(-11.5, 7.5, -20.5, -9, 2.6);
  hip(6.5, 20.5, -6, 7, 2.2);

  // Central lantern with an arched thermal window on each face.
  const lantern: P2[] = [[-6, -7], [5, -7], [5, 6], [-6, 6]];
  shell.prism(lantern, EAVE, sites.academy.heightM - .8, stucco, trim);
  band(lantern, sites.academy.heightM - .8, sites.academy.heightM, .35, trim);
  const arch = (cx: number, cz: number, nx: number, nz: number, r: number, spring: number, sill: number, glass: string) => {
    const at = (u: number, y: number) => [cx + nz * u + nx * .06, y, cz - nx * u + nz * .06];
    if (sill < spring) shell.body.quad(at(-r, sill), at(r, sill), at(r, spring), at(-r, spring), glass);
    for (let k = 0; k < 8; k++) {
      const a0 = k * Math.PI / 8, a1 = (k + 1) * Math.PI / 8;
      shell.body.tri(at(0, spring), at(r * Math.cos(a0), spring + r * Math.sin(a0)), at(r * Math.cos(a1), spring + r * Math.sin(a1)), glass);
    }
  };
  for (const [cx, cz, nx, nz] of [[-6, -.5, -1, 0], [5, -.5, 1, 0], [-.5, -7, 0, -1], [-.5, 6, 0, 1]])
    arch(cx, cz, nx, nz, 2.4, 11.2, 11.2, '#55605e');

  // Tall arched windows in blind arches along the West Peachtree front and the wings' ends.
  for (const z of [-17, 13.5]) {
    arch(-13.9 + (z > 0 ? 0 : 2.3), z, -1, 0, 1.6, 6, 6, shade);
    arch(-13.9 + (z > 0 ? -.02 : 2.28), z, -1, 0, 1, 5.8, 2.6, '#4c5552');
  }
  for (const x of [-6, 0]) for (const [z, nz] of [[-21.1, -1], [18.9, 1]] as const) {
    arch(x, z, 0, nz, 1.6, 6, 6, shade);
    arch(x, z + nz * .02, 0, nz, 1, 5.8, 2.6, '#4c5552');
  }

  // The portico: six columns, a frieze lettered ACADEMY OF MEDICINE (drawn as a band),
  // and a pediment, over steps down to the West Peachtree walk.
  const px = -13.9, z0 = -7.2, z1 = 4.4;
  const disc = (x: number, z: number, r: number): P2[] => Array.from({ length: 12 }, (_, i) => [x + r * Math.cos(i * Math.PI / 6), z + r * Math.sin(i * Math.PI / 6)]);
  for (let i = 0; i < 6; i++) {
    const z = z0 + .6 + i * (z1 - z0 - 1.2) / 5;
    shell.prism(disc(px + .5, z, .42), PLINTH, 7.2, trim, trim);
    shell.prism(disc(px + .5, z, .55), 7.0, 7.25, trim, trim);
  }
  const porch: P2[] = [[px, z0], [px + 3, z0], [px + 3, z1], [px, z1]];
  shell.prism(porch, 7.25, 8.6, trim, trim);
  for (let k = 0; k < 9; k++) {
    const z = z0 + 1.2 + k * (z1 - z0 - 2.4) / 8; // frieze lettering, a dark band of glyph blocks
    shell.body.quad([px - .02, 7.8, z - .25], [px - .02, 7.8, z + .25], [px - .02, 8.15, z + .25], [px - .02, 8.15, z - .25], '#8f8676');
  }
  const ridge = 11;
  shell.body.tri([px, 8.6, z0], [px, 8.6, z1], [px, ridge, (z0 + z1) / 2], trim);
  for (const [za, zb] of [[z0, (z0 + z1) / 2], [(z0 + z1) / 2, z1]])
    shell.body.quad([px, za === z0 ? 8.6 : ridge, za], [px, zb === z1 ? 8.6 : ridge, zb], [px + 5, zb === z1 ? 8.6 : ridge, zb], [px + 5, za === z0 ? 8.6 : ridge, za], copper);
  for (let k = 0; k < 5; k++) {
    const h = PLINTH * (1 - k / 5), x = px - .45 * (k + 1);
    shell.prism([[x, z0 + 2.4], [x + .45, z0 + 2.4], [x + .45, z1 - 2.4], [x, z1 - 2.4]], shell.base, h, base, base);
  }
  // Warm lamps behind the portico doors and the arched windows (illustrative occupancy).
  shell.lights.quad([px + 2.9, PLINTH + .1, -1.2], [px + 2.9, PLINTH + .1, .4], [px + 2.9, 5.4, .4], [px + 2.9, 5.4, -1.2], '#f0d3a0');
  return shell.finish('#ffdcaa', .55);
}
