import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import { classicalOrnament } from './classical-ornament';
import sites from './fixtures/midtown-skyline.json';
import plan from './fixtures/midtown-skyline/wimbish.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// The Wimbish House (W. T. Downing, 1898), home of the Atlanta Woman's Club:
// a buff stone Châteauesque house under a steep slate hip roof, a round drum
// bay and a conical turret framing an arched loggia on the south front, twin
// pinnacled dormers between them, and a tall chimney. The long wing to the
// west is the club's later addition, kept plain. Origin (745, -3560), x east.
const stone = '#d8c9ac', trim = '#e6dac3', slate = '#59606a', shade = '#a6957b', glass = ['#4a524f', '#565d58'];

export function wimbishHouse(shell: Shell) {
  const { band, rusticated } = classicalOrnament(shell, { stone: trim, shade, limestone: '#cfbf9f', joint: shade });
  const ccw = (r: P2[]) => r.reduce((s, [x, z], i) => { const [a, b] = r[(i + 1) % r.length]; return s + x * b - z * a; }, 0) < 0 ? [...r].reverse() : r;
  const parts = plan.parts.map(p => ({ ...p, ring: ccw(p.ring as P2[]) }));
  const main = parts.find(p => p.id === 'osm:way:1451518630');
  const porchPart = parts.find(p => p.id === 'osm:way:1427404766');
  // The west wing and other low parts at their mapped heights, a little raised for a parapet.
  for (const p of parts) {
    if (p === porchPart) continue;
    const h = p === main ? 8 : p.h;
    shell.prism(p.ring, shell.base, h, stone, '#b9b3a6');
    p.ring.forEach((a, i) => shell.facade(a, p.ring[(i + 1) % p.ring.length], 1, h - 1, Math.max(1, Math.round(h / 3.6)), 2.6, .45, .6, glass, .12));
    band(p.ring, h - .5, h, .25);
  }

  // The house: three storeys under a steep hip roof.
  const EAVE = 11.5, RIDGE = 18;
  const house: P2[] = [[8, -12.5], [26.5, -12.5], [26.5, 4], [8, 4]];
  shell.prism(house, shell.base, EAVE, stone, slate);
  house.forEach((a, i) => shell.facade(a, house[(i + 1) % house.length], 1.6, EAVE - .6, 3, 2.8, .42, .62, glass, .15));
  rusticated(house, shell.base, 1.4);
  band(house, 4.3, 4.6, .12);
  band(house, EAVE - .4, EAVE, .45, trim);
  const x0 = 8, z0 = -12.5, x1 = 26.5, z1 = 4;
  const r0 = [x0 + 4, RIDGE, (z0 + z1) / 2], r1 = [x1 - 4, RIDGE, (z0 + z1) / 2];
  const e = (x: number, z: number) => [x, EAVE, z];
  shell.body.quad(e(x0, z1), e(x1, z1), r1, r0, slate);
  shell.body.quad(e(x1, z0), e(x0, z0), r0, r1, slate);
  shell.body.tri(e(x0, z0), e(x0, z1), r0, slate);
  shell.body.tri(e(x1, z1), e(x1, z0), r1, slate);

  // Round drum bay (left) and conical turret (right) on the south front.
  const ring = (cx: number, cz: number, r: number, n = 16): P2[] => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(i * 2 * Math.PI / n), cz + r * Math.sin(i * 2 * Math.PI / n)]);
  const cone = (cx: number, cz: number, r: number, y: number, top: number) => {
    const base = ring(cx, cz, r + .3);
    base.forEach(([x, z], i) => { const [a, b] = base[(i + 1) % base.length]; shell.body.tri([x, y, z], [a, y, b], [cx, top, cz], slate); });
  };
  for (const [cx, cz, r, wall, top] of [[11.8, 4, 3, 11.8, 15.5], [21.2, 3.4, 2.7, 13.2, sites.wimbish.heightM - .4]] as const) {
    const drum = ring(cx, cz, r);
    shell.prism(drum, shell.base, wall, stone, slate);
    drum.forEach((a, i) => { if (a[1] > cz - .5) shell.facade(a, drum[(i + 1) % drum.length], 4.8, wall - .8, 2, 1.9, .5, .55, glass, .12); });
    band(drum, 4.3, 4.6, .12);
    band(drum, wall - .4, wall, .4, trim);
    cone(cx, cz, r, wall, top);
    shell.prism(ring(cx, cz, .12, 6), top - .2, top + .4, '#3c4148', '#3c4148');
  }

  // Twin dormers with pinnacles rising from the south roof between the drum and turret.
  for (const dx of [15.2, 17.6]) {
    const box: P2[] = [[dx - 1, 3.2], [dx + 1, 3.2], [dx + 1, 4.15], [dx - 1, 4.15]];
    shell.prism(box, EAVE - .5, 15.6, trim, slate);
    shell.facade([dx - .9, 4.15], [dx + .9, 4.15], EAVE + .3, 15.2, 2, 1.8, .7, .7, glass, .2);
    shell.body.tri([dx - 1, 15.6, 4.15], [dx + 1, 15.6, 4.15], [dx, 17.2, 4.15], trim);
    for (const s of [-1, 1]) shell.prism(ring(dx + s * 1, 4.15, .16, 6), 15.6, 17.6, trim, trim);
  }
  // Tall chimney.
  shell.prism([[23, -9], [24.4, -9], [24.4, -7.6], [23, -7.6]], EAVE, 20.5, stone, '#8d7f6a');

  // The arched loggia across the front: four arches on stout columns, a balustrade, a flat roof.
  if (porchPart) {
    const lo = Math.min(...porchPart.ring.map(p => p[0])), hi = Math.max(...porchPart.ring.map(p => p[0]));
    const front = Math.max(...porchPart.ring.map(p => p[1]));
    const loggia: P2[] = [[lo, 4], [hi, 4], [hi, front], [lo, front]];
    shell.prism(loggia, shell.base, 1.1, '#cfbf9f', trim);
    shell.prism(loggia, 4.1, 4.7, stone, '#9e9890');
    const n = 4, w = (hi - lo) / n;
    for (let i = 0; i <= n; i++) {
      const x = lo + i * w;
      shell.prism([[x - .3, front - .6], [x + .3, front - .6], [x + .3, front], [x - .3, front]], 1.1, 4.1, trim, trim);
    }
    for (let i = 0; i < n; i++) {
      const cx = lo + (i + .5) * w, r = w / 2 - .3;
      for (let k = 0; k < 8; k++) {
        const a0 = k * Math.PI / 8, a1 = (k + 1) * Math.PI / 8;
        const p = (a: number, rr: number) => [cx + rr * Math.cos(a), 2.9 + rr * Math.sin(a) * .8, front + .01];
        shell.body.quad(p(a0, r), p(a1, r), p(a1, r + 2), p(a0, r + 2), stone);
      }
      shell.body.quad([cx - r, 1.1, front + .02], [cx + r, 1.1, front + .02], [cx + r, 1.95, front + .02], [cx - r, 1.95, front + .02], '#ece4d3');
    }
    shell.lights.quad([lo + 1, 1.3, 4.05], [hi - 1, 1.3, 4.05], [hi - 1, 3.6, 4.05], [lo + 1, 3.6, 4.05], '#e8c58f');
  }
  return shell.finish('#ffd9a3', .6);
}
