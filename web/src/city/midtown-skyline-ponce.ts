import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import { classicalOrnament } from './classical-ornament';
import sites from './fixtures/midtown-skyline.json';
import plan from './fixtures/midtown-skyline/ponce.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// The Ponce de Leon Apartments (William L. Stoddart, 1913), now The Ponce
// condominiums, at Peachtree and Ponce: buff brick on a curved front that faces
// the corner, over a two-storey white terra-cotta colonnade; a deep green
// bracketed cornice; stacked round iron balconies where the curve meets two
// square corner towers, each crowned by an open arched belvedere under a
// green tile hip roof. Origin (648, -2008), x east, z south.
const brick = '#d4c09a', terra = '#ece4d2', green = '#4c7562', iron = '#2d3131', glass = ['#3f4848', '#4a5352'];

export function ponceDeLeon(shell: Shell) {
  const { band, modillions, edges } = classicalOrnament(shell, { stone: terra, shade: '#a99d88', limestone: terra, joint: '#c9bfac' });
  const ccw = (r: P2[]) => r.reduce((s, [x, z], i) => { const [a, b] = r[(i + 1) % r.length]; return s + x * b - z * a; }, 0) < 0 ? [...r].reverse() : r;
  const parts = plan.parts.map(p => ({ ...p, ring: ccw(p.ring as P2[]) }));
  const main = parts.find(p => p.id === 'osm:way:1456383992');
  const towers = parts.filter(p => p.id === 'osm:way:1456383993' || p.id === 'osm:way:1456383994');
  const BASE = 8, TOP = main?.h ?? 43.2, BELV = 50.4;

  for (const p of [...(main ? [main] : []), ...towers]) {
    shell.prism(p.ring, shell.base, TOP, brick, '#9d968a');
    p.ring.forEach((a, i) => shell.facade(a, p.ring[(i + 1) % p.ring.length], BASE + .6, TOP - 2.2, 10, 2.5, .48, .62, glass, .16));
    // The two-storey terra-cotta base and its entablature.
    for (const e of edges(p.ring)) {
      const at = (t: number, y: number) => [e.x + e.tx * t + e.nx * .05, y, e.z + e.tz * t + e.nz * .05];
      shell.body.quad(at(0, shell.base), at(e.length, shell.base), at(e.length, BASE), at(0, BASE), terra);
    }
    band(p.ring, BASE, BASE + .7, .35, terra);
    band(p.ring, TOP - 1.6, TOP - 1.2, .25, terra);
    modillions(p.ring, TOP - 1.2, TOP - .7, 1.1, 1.2, .3);
    band(p.ring, TOP - .7, TOP, 1.3, green);
  }

  // Colonnade along the curved front facing the corner (walls whose outward normal points north-west).
  const disc = (x: number, z: number, r: number, n = 10): P2[] => Array.from({ length: n }, (_, i) => [x + r * Math.cos(i * 2 * Math.PI / n), z + r * Math.sin(i * 2 * Math.PI / n)]);
  if (main) for (const e of edges(main.ring)) {
    if (!(e.nx < -.25 && e.nz < -.25) || e.length < 2) continue;
    for (let t = 1.2; t < e.length - .6; t += 2.6) {
      const x = e.x + e.tx * t + e.nx * .9, z = e.z + e.tz * t + e.nz * .9;
      shell.prism(disc(x, z, .38), shell.base, BASE - .3, terra, terra);
    }
    const at = (t: number, y: number) => [e.x + e.tx * t + e.nx * .4, y, e.z + e.tz * t + e.nz * .4];
    shell.lights.quad(at(.5, Math.max(1, shell.base + 1)), at(e.length - .5, Math.max(1, shell.base + 1)), at(e.length - .5, 6.4), at(.5, 6.4), '#8f8a7c');
  }

  // Stacked semicircular iron balconies where the curve meets each tower.
  for (const [cx, cz, facing] of [[6.2, -15.6, Math.PI * 1.25], [-17.6, 4.4, Math.PI * 1.25]] as const) {
    for (let y = BASE + 3.6; y < TOP - 3; y += 3.6) {
      const arc: P2[] = Array.from({ length: 9 }, (_, i) => {
        const a = facing - Math.PI / 2 + i * Math.PI / 8;
        return [cx + 1.5 * Math.cos(a), cz + 1.5 * Math.sin(a)];
      });
      shell.prism([[cx, cz], ...arc], y, y + .18, iron, iron);
      arc.forEach(([x, z], i) => {
        if (i === arc.length - 1) return;
        const [a, b] = arc[i + 1];
        shell.body.quad([x, y + .18, z], [a, y + .18, b], [a, y + 1.1, b], [x, y + 1.1, z], iron);
      });
    }
  }

  // Open arched belvederes on both towers under green tile hip roofs.
  for (const t of towers) {
    const xs = t.ring.map(p => p[0]), zs = t.ring.map(p => p[1]);
    const [x0, x1, z0, z1] = [Math.min(...xs) + .6, Math.max(...xs) - .6, Math.min(...zs) + .6, Math.max(...zs) - .6];
    for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]])
      shell.prism([[x - .9, z - .9], [x + .9, z - .9], [x + .9, z + .9], [x - .9, z + .9]], TOP, BELV - 1.6, terra, terra);
    const slab: P2[] = [[x0 - 1, z0 - 1], [x1 + 1, z0 - 1], [x1 + 1, z1 + 1], [x0 - 1, z1 + 1]];
    // Arched heads between the piers, one per face.
    for (const [ax, az, bx, bz] of [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]]) {
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, len = Math.hypot(bx - ax, bz - az), r = len / 2 - .9;
      const ux = (bx - ax) / len, uz = (bz - az) / len, spring = BELV - 1.6 - r * .8;
      for (let k = 0; k < 8; k++) {
        const a0 = k * Math.PI / 8, a1 = (k + 1) * Math.PI / 8;
        const p = (a: number, y: number) => [mx + ux * r * Math.cos(a), y, mz + uz * r * Math.cos(a)];
        shell.body.quad(p(a0, spring + r * .8 * Math.sin(a0)), p(a1, spring + r * .8 * Math.sin(a1)), p(a1, BELV - 1.6), p(a0, BELV - 1.6), terra);
      }
    }
    shell.prism(slab, BELV - 1.6, BELV - .9, terra, terra);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, peak = Math.max(sites.ponce.heightM, BELV + 1);
    const roof: P2[] = [[x0 - 1.3, z0 - 1.3], [x1 + 1.3, z0 - 1.3], [x1 + 1.3, z1 + 1.3], [x0 - 1.3, z1 + 1.3]];
    roof.forEach(([x, z], i) => { const [a, b] = roof[(i + 1) % 4]; shell.body.tri([x, BELV - .9, z], [a, BELV - .9, b], [cx, peak, cz], green); });
  }
  // Small rooftop structure behind the curve.
  const pent = parts.find(p => p.id === 'osm:way:1456383991');
  if (pent) shell.prism(pent.ring, TOP, TOP + 2.6, brick, '#9d968a');
  return shell.finish('#ffdca8', .7);
}
