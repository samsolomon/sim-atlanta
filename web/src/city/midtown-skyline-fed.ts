import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import { classicalOrnament } from './classical-ornament';
import sites from './fixtures/midtown-skyline.json';
import plan from './fixtures/midtown-skyline/fed.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// The Federal Reserve Bank of Atlanta (Kohn Pedersen Fox, 2001) at Peachtree and
// 10th: white Georgia marble in large ashlar blocks, a grid of deep punched
// windows between flat piers, a tower that steps back in tiers to a flat crown,
// a two-storey loggia on its Peachtree front, salvaged Corinthian columns
// along the forecourt, and the eagle column at the corner plaza. The low
// operations wing to the west stays plain. Origin (588, -3155), x east, z south.
const marble = '#e9e7e1', joint = '#cfcdc6', shade = '#bdbab2', glass = ['#2f3a44', '#3a4651', '#2a333c'];
const TOWER = 'osm:way:886034015';

export function federalReserve(shell: Shell) {
  const { band, edges } = classicalOrnament(shell, { stone: marble, shade, limestone: marble, joint });
  const ccw = (r: P2[]) => r.reduce((s, [x, z], i) => { const [a, b] = r[(i + 1) % r.length]; return s + x * b - z * a; }, 0) < 0 ? [...r].reverse() : r;
  const parts = plan.parts.map(p => ({ ...p, ring: ccw(p.ring as P2[]) }));
  const tower = parts.find(p => p.id === TOWER);
  // Ashlar coursing: a fine joint every 1.5 m up each wall, the marble's large-block look.
  const ashlar = (ring: P2[], lo: number, hi: number) => {
    for (const e of edges(ring)) for (let y = lo + 1.5; y < hi - .2; y += 1.5) {
      const at = (t: number) => [e.x + e.tx * t + e.nx * .04, y, e.z + e.tz * t + e.nz * .04];
      const a = at(0), b = at(e.length);
      shell.body.quad(a, b, [b[0], y + .05, b[2]], [a[0], y + .05, a[2]], joint);
    }
  };
  for (const p of parts) {
    if (p === tower || p.id.endsWith('1457022226') || p.id.endsWith('1457022227')) continue;
    shell.prism(p.ring, shell.base, p.h, marble, '#c9c7c0');
    if (p.h > 6) {
      p.ring.forEach((a, i) => shell.facade(a, p.ring[(i + 1) % p.ring.length], 1.6, p.h - 1.4, Math.max(1, Math.round(p.h / 3.8)), 3.6, .5, .55, glass, .1));
      ashlar(p.ring, shell.base, p.h);
      band(p.ring, p.h - .6, p.h, .3);
    }
  }

  // The tower: twelve storeys of punched windows, stepping back in three tiers
  // at the north and south ends to a flat crown (heights inferred from the photographs).
  if (tower) {
    const xs = tower.ring.map(p => p[0]), zs = tower.ring.map(p => p[1]);
    const [x0, x1, z0, z1] = [Math.max(Math.min(...xs), 23), Math.max(...xs) - .5, Math.min(...zs) + 1, Math.max(...zs) - 1];
    const tiers = [[0, 0, 36], [4, 8, 40.5], [8, 16, 44.5], [11, 23, sites.fed.heightM]] as const;
    let lo = shell.base;
    for (const [inX, inZ, top] of tiers) {
      const ring: P2[] = ccw([[x0 + inX, z0 + inZ], [x1 - inX, z0 + inZ], [x1 - inX, z1 - inZ], [x0 + inX, z1 - inZ]]);
      shell.prism(ring, lo, top, marble, '#d4d2cb');
      ring.forEach((a, i) => shell.facade(a, ring[(i + 1) % ring.length], Math.max(lo, 8.6) + .8, top - 1.2,
        Math.max(1, Math.round((top - Math.max(lo, 8.6)) / 3.6)), 3.2, .5, .62, glass, .2));
      ashlar(ring, lo, top);
      band(ring, top - .5, top, .25);
      lo = top;
    }
    // Two-storey loggia on the Peachtree (east) front: square piers carrying a deep lintel.
    const lx = x1 + .02, lz0 = z0 + 10, lz1 = z1 - 10;
    for (let z = lz0; z <= lz1 + .01; z += (lz1 - lz0) / 10)
      shell.prism([[lx, z - .5], [lx + 2.4, z - .5], [lx + 2.4, z + .5], [lx, z + .5]], shell.base, 7.6, marble, marble);
    shell.prism([[lx, lz0 - .5], [lx + 2.6, lz0 - .5], [lx + 2.6, lz1 + .5], [lx, lz1 + .5]], 7.6, 8.6, marble, marble);
    shell.body.quad([lx + .01, .4, lz0], [lx + .01, .4, lz1], [lx + .01, 7.2, lz1], [lx + .01, 7.2, lz0], '#3b454e');
    shell.lights.quad([lx + .03, .6, lz0 + 1], [lx + .03, .6, lz1 - 1], [lx + .03, 6.8, lz1 - 1], [lx + .03, 6.8, lz0 + 1], '#e9cf9f');

    // Salvaged Corinthian columns standing free along the forecourt, and the eagle column.
    const disc = (x: number, z: number, r: number, n = 10): P2[] => Array.from({ length: n }, (_, i) => [x + r * Math.cos(i * 2 * Math.PI / n), z + r * Math.sin(i * 2 * Math.PI / n)]);
    for (let k = 0; k < 6; k++) {
      const z = lz0 + 2 + k * (lz1 - lz0 - 4) / 5, x = lx + 7;
      shell.prism(disc(x, z, .55), shell.base, .6, marble, marble);
      shell.prism(disc(x, z, .38), .6, 6.4, '#b8b2a5', '#b8b2a5');
      shell.prism(disc(x, z, .62), 6.4, 7.2, '#a89f8e', '#a89f8e');
    }
    const ex = x1 + 10, ez = z1 + 6;
    shell.prism([[ex - 1.3, ez - 1.3], [ex + 1.3, ez - 1.3], [ex + 1.3, ez + 1.3], [ex - 1.3, ez + 1.3]], shell.base, 2.2, marble, marble);
    shell.prism(disc(ex, ez, .5), 2.2, 10, marble, marble);
    shell.prism(disc(ex, ez, .7), 10, 10.4, marble, marble);
    for (const s of [-1, 1]) shell.body.tri([ex, 10.6, ez], [ex + s * 1.6, 11.6, ez], [ex + s * .4, 10.9, ez + .3], '#2b2d2c');
    shell.prism(disc(ex, ez, .35, 6), 10.4, 11.3, '#2b2d2c', '#2b2d2c');
  }
  return shell.finish('#ffe2b4', .6);
}
