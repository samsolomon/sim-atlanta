import type { P2 } from '../vignette/geom';
import { flowerBed, hedge } from '../landscape/primitives';
import type { LocalGround } from './midtown-skyline';
import type { localLandmarkShell } from './landmark-shell';
import { classicalOrnament } from './classical-ornament';
import sites from './fixtures/midtown-skyline.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// The Academy of Medicine (Hentz, Adler & Shutze, 1941): a cream stucco
// temple on a raised base. A six-column pedimented portico faces West
// Peachtree (local -x), copper hipped roofs cover the wings, a square
// lantern with arched thermal windows rises over the centre, and tall
// arched windows sit in blind arches. Origin (451, -2720), x east.
// Smooth putty-cream stucco (verified on the 2009 photograph at full resolution),
// a banded stucco base under a cast-stone water table, and aged copper roofs.
const stucco = '#e2d6bf', base = '#d8ccb3', trim = '#eee6d4', copper = '#8da396', seam = '#6f8579', shade = '#a99c86';
const stain = '#d0c3a9', glazing = '#3b4241', muntin = '#f2efe6';

export function academyOfMedicine(shell: Shell, ground: LocalGround) {
  const { band, modillions, rusticated, edges } = classicalOrnament(shell, { stone: trim, shade, limestone: base, joint: '#c6b99f' });
  const ring = shell.ring.reduce((s, [x, z], i) => { const [a, b] = shell.ring[(i + 1) % shell.ring.length]; return s + x * b - z * a; }, 0) < 0
    ? [...shell.ring].reverse() : shell.ring;
  const PLINTH = 1.6, EAVE = 8.4;
  shell.prism(ring, shell.base, PLINTH, base, base);
  shell.prism(ring, PLINTH, EAVE, stucco, stucco);
  rusticated(ring, shell.base, PLINTH - .25);
  band(ring, PLINTH - .25, PLINTH, .15, trim);
  // Weathering: faint streaks under the eaves where water runs off the cornice.
  for (const e of edges(ring)) {
    if (e.length < 3) continue;
    for (let t = 1.1; t < e.length - .6; t += 2.9 + ((e.x * 7 + t * 13) % 1.7)) {
      const len = 1.4 + ((e.z * 5 + t * 11) % 1.9);
      const at = (u: number, y: number) => [e.x + e.tx * u + e.nx * .03, y, e.z + e.tz * u + e.nz * .03];
      shell.body.quad(at(t, EAVE - .55 - len), at(t + .35, EAVE - .55 - len), at(t + .35, EAVE - .55), at(t, EAVE - .55), stain);
    }
  }
  band(ring, EAVE - .5, EAVE - .2, .2, trim);
  modillions(ring, EAVE - .2, EAVE + .05, .45, 1.1, .22);
  band(ring, EAVE + .05, EAVE + .45, .55, trim);

  // Copper hipped roofs over the north and south wings and the rear.
  const hip = (x0: number, x1: number, z0: number, z1: number, rise: number) => {
    const y = EAVE + .45, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rx = (x1 - x0) / 2, rz = (z1 - z0) / 2;
    const ridge = rx > rz ? [[cx - rx + rz, cz], [cx + rx - rz, cz]] : [[cx, cz - rz + rx], [cx, cz + rz - rx]];
    const [a, b] = ridge.map(([x, z]) => [x, y + rise, z]);
    const c = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
    const faces: [number[], number[], number[], number[]][] = rx > rz
      ? [[c[0], c[1], b, a], [c[2], c[3], a, b], [c[1], c[2], b, b], [c[3], c[0], a, a]]
      : [[c[1], c[2], b, a], [c[3], c[0], a, b], [c[0], c[1], a, a], [c[2], c[3], b, b]];
    // Each face, plus darker standing seams from eave to ridge every 2.2 m (bundled at City scale).
    for (const [p, q, r, l] of faces) {
      if (r === l) shell.body.tri(p, q, r, copper); else shell.body.quad(p, q, r, l, copper);
      const span = Math.hypot(q[0] - p[0], q[2] - p[2]), n = Math.floor(span / 2.2);
      const mix = (u: number[], v: number[], t: number) => u.map((x, i) => x + (v[i] - x) * t);
      for (let k = 1; k < n; k++) {
        const t = k / n, lo = mix(p, q, t), hi = mix(l, r, t);
        const w = [(q[0] - p[0]) / span * .05, 0, (q[2] - p[2]) / span * .05];
        shell.body.quad([lo[0] - w[0], lo[1] + .03, lo[2] - w[2]], [lo[0] + w[0], lo[1] + .03, lo[2] + w[2]],
          [hi[0] + w[0], hi[1] + .03, hi[2] + w[2]], [hi[0] - w[0], hi[1] + .03, hi[2] - w[2]], seam);
      }
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

  // Arched sash windows: a moulded surround with a keystone inside a recessed
  // blind arch, white muntins, a radiating fanlight and a stone sill.
  function sash(cx: number, cz: number, nx: number, nz: number, sill = 2.6, spring = 5.8, r = 1) {
    const at = (u: number, y: number, o = 0) => [cx + nz * u + nx * (.06 + o), y, cz - nx * u + nz * (.06 + o)];
    const fan = (rr: number, k: number, y = spring) => at(rr * Math.cos(k * Math.PI / 8), y + rr * Math.sin(k * Math.PI / 8));
    // Blind arch recess, a little darker than the wall.
    shell.body.quad(at(-r - .55, sill - .5, -.01), at(r + .55, sill - .5, -.01), at(r + .55, spring, -.01), at(-r - .55, spring, -.01), '#d5c9b1');
    for (let k = 0; k < 8; k++) shell.body.tri(at(0, spring, -.01), fan(r + .55, k), fan(r + .55, k + 1), '#d5c9b1');
    // Glass, then the surround ring and its jambs.
    shell.body.quad(at(-r, sill), at(r, sill), at(r, spring), at(-r, spring), glazing);
    for (let k = 0; k < 8; k++) {
      shell.body.tri(at(0, spring), fan(r, k), fan(r, k + 1), glazing);
      const [a0, a1, b0, b1] = [fan(r, k), fan(r, k + 1), fan(r + .2, k), fan(r + .2, k + 1)];
      shell.body.quad(a0.map((v, i) => i === 1 ? v : v + [nx, 0, nz][i] * .02), a1.map((v, i) => i === 1 ? v : v + [nx, 0, nz][i] * .02),
        b1.map((v, i) => i === 1 ? v : v + [nx, 0, nz][i] * .02), b0.map((v, i) => i === 1 ? v : v + [nx, 0, nz][i] * .02), trim);
    }
    for (const s of [-1, 1]) shell.body.quad(at(s * r, sill, .02), at(s * (r + .2), sill, .02), at(s * (r + .2), spring, .02), at(s * r, spring, .02), trim);
    // Muntins: a centre bar, two meeting rails and the fanlight's radials.
    const bar = (u0: number, y0: number, u1: number, y1: number) => {
      const dx = u1 - u0, dy = y1 - y0, l = Math.hypot(dx, dy), ox = -dy / l * .05, oy = dx / l * .05;
      shell.body.quad(at(u0 - ox, y0 - oy, .03), at(u0 + ox, y0 + oy, .03), at(u1 + ox, y1 + oy, .03), at(u1 - ox, y1 - oy, .03), muntin);
    };
    bar(0, sill, 0, spring);
    for (const y of [sill + (spring - sill) / 3, sill + 2 * (spring - sill) / 3, spring]) bar(-r, y, r, y);
    for (const k of [1, 2, 3, 4, 5, 6, 7]) bar(0, spring, r * Math.cos(k * Math.PI / 8), spring + r * Math.sin(k * Math.PI / 8));
    // Keystone and sill.
    shell.body.quad(at(-.18, spring + r - .05, .05), at(.18, spring + r - .05, .05), at(.25, spring + r + .32, .05), at(-.25, spring + r + .32, .05), trim);
    shell.body.quad(at(-r - .3, sill - .12, .1), at(r + .3, sill - .12, .1), at(r + .3, sill, .1), at(-r - .3, sill, .1), trim);
  }
  for (const z of [-17, 13.5]) sash(z > 0 ? -13.92 : -11.62, z, -1, 0);
  for (const x of [-6, 0]) for (const [z, nz] of [[-21.12, -1], [18.92, 1]] as const) sash(x, z, 0, nz);

  // The portico: six columns, a frieze lettered ACADEMY OF MEDICINE (drawn as a band),
  // and a pediment, over steps down to the West Peachtree walk.
  const px = -13.9, z0 = -7.2, z1 = 4.4;
  const disc = (x: number, z: number, r: number): P2[] => Array.from({ length: 12 }, (_, i) => [x + r * Math.cos(i * Math.PI / 6), z + r * Math.sin(i * Math.PI / 6)]);
  for (let i = 0; i < 6; i++) {
    const z = z0 + .6 + i * (z1 - z0 - 1.2) / 5;
    // Tuscan columns: square plinth and torus base, shaft, echinus and square abacus.
    shell.prism([[px - .05, z - .55], [px + 1.05, z - .55], [px + 1.05, z + .55], [px - .05, z + .55]], PLINTH, PLINTH + .22, trim, trim);
    shell.prism(disc(px + .5, z, .5), PLINTH + .22, PLINTH + .42, trim, trim);
    shell.prism(disc(px + .5, z, .42), PLINTH + .42, 6.75, trim, trim);
    shell.prism(disc(px + .5, z, .52), 6.75, 6.98, trim, trim);
    shell.prism([[px - .1, z - .6], [px + 1.1, z - .6], [px + 1.1, z + .6], [px - .1, z + .6]], 6.98, 7.25, trim, trim);
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
  // The caduceus relief in the tympanum: a staff, two wings and a roundel, in light stone.
  const mid = (z0 + z1) / 2, tx = px - .04;
  shell.body.quad([tx, 8.75, mid - .08], [tx, 8.75, mid + .08], [tx, 10.4, mid + .08], [tx, 10.4, mid - .08], '#f6f1e6');
  for (const s of [-1, 1]) shell.body.tri([tx, 9.9, mid], [tx, 10.35, mid + s * 1.3], [tx, 9.7, mid + s * .9], '#f6f1e6');
  // The central door in a moulded surround with a fanlight, and the arched windows either side.
  const wall = -11.85, dz = mid;
  const door = (u: number, y: number, o = 0) => [wall - o, y, dz + u];
  shell.body.quad(door(-1.25, PLINTH, .02), door(1.25, PLINTH, .02), door(1.25, 5.9, .02), door(-1.25, 5.9, .02), trim);
  shell.body.quad(door(-.95, PLINTH, .04), door(.95, PLINTH, .04), door(.95, 4.5, .04), door(-.95, 4.5, .04), '#5a4a3a');
  shell.body.quad(door(-.95, 4.6, .04), door(.95, 4.6, .04), door(.95, 5.6, .04), door(-.95, 5.6, .04), glazing);
  for (const u of [-3.4, 3.4]) sash(wall, dz + u, -1, 0, PLINTH + .6, 4.9, .8);
  // Warm light behind the door glass and the portico sashes at night (illustrative occupancy).
  shell.lights.quad(door(-.9, 4.62, .05), door(.9, 4.62, .05), door(.9, 5.55, .05), door(-.9, 5.55, .05), '#f0d3a0');

  // The formal front garden (Classical Revival, 1941; front lawn kept largely original per
  // Georgia Tech's 2023 preservation plan): a brick walk from West Peachtree to the steps,
  // clipped boxwood along the walk, the street edge and the foundation, and two formal beds
  // of rich black soil flanking the steps.
  const g = (x: number, z: number) => ground(x, z);
  const walk = (x0: number, x1: number, w: number) => {
    for (let x = x0; x < x1; x += 2) {
      const xa = x, xb = Math.min(x + 2, x1), ya = (g(xa, mid) ?? 0) + .04, yb = (g(xb, mid) ?? 0) + .04;
      shell.body.quad([xa, ya, mid - w], [xa, ya, mid + w], [xb, yb, mid + w], [xb, yb, mid - w], '#a7806c');
    }
  };
  walk(-46, px - 2.3, 1.2);
  for (const s of [-1, 1]) {
    hedge(shell.body, [[-45, mid + s * 1.8], [-21, mid + s * 1.8]], g, { height: .8, width: .7, seed: `academy-walk-${s}` });
    hedge(shell.body, [[-45.5, mid + s * 2.6], [-45.5, mid + s * 23]], g, { height: 1, width: .8, seed: `academy-street-${s}` });
    hedge(shell.body, [[-15.6, mid + s * 7.2], [-15.6, mid + s * 21]], g, { height: 1.1, width: .9, seed: `academy-base-${s}` });
    const bed: P2[] = [[-20.5, mid + s * 2.6], [-28, mid + s * 2.6], [-28, mid + s * 6.4], [-20.5, mid + s * 6.4]];
    flowerBed(shell.body, s > 0 ? bed : [...bed].reverse(), g, { doy: 324, soil: 'rich-black', density: .6, seed: `academy-bed-${s}` });
    hedge(shell.body, [bed[0], bed[1], bed[2], bed[3], bed[0]], g, { height: .45, width: .45, seed: `academy-edge-${s}` });
  }
  return shell.finish('#ffdcaa', .55);
}
