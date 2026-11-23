import * as THREE from 'three';
import { Builder, type P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import { classicalOrnament } from './classical-ornament';
import plan from './fixtures/midtown-skyline/biltmore.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// The Atlanta Biltmore (Schultze & Weaver, 1924): red-brown brick over a
// two-storey limestone base, stone quoins, a crowning cornice on modillions,
// a two-storey portico on West Peachtree, and the two WSB lattice masts that
// carry the vertical BILTMORE letters, lit red at night.
const brick = '#a65e45', roofTint = '#7f7b74';
const colours = { stone: '#dcd2c0', shade: '#9f9584', limestone: '#d6ccb9', joint: '#a79c88' };
const FLOOR = 3.9, BASE = 8;

// 5x7 bitmap rows for the eight letters, top row first.
const GLYPHS: Record<string, string[]> = {
  B: ['11110','10001','10001','11110','10001','10001','11110'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
};

export function biltmore(shell: Shell) {
  const { band, modillions, rusticated, quoins } = classicalOrnament(shell, colours);
  const glass = ['#2f3b43', '#38454e', '#2b343b'];
  // Facades face outward only on counter-clockwise rings (as in 1180 Peachtree).
  const ccw = (ring: P2[]) => ring.reduce((s, [x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; return s + x * b - z * a; }, 0) < 0 ? [...ring].reverse() : ring;
  const parts = plan.parts.map(p => ({ ...p, ring: ccw(p.ring as P2[]) }));
  for (const p of parts) {
    shell.prism(p.ring, shell.base, p.h, brick, roofTint);
    if (p.h < 20) continue; // low service annexes stay plain
    const rows = Math.max(1, Math.round((p.h - BASE - 2) / FLOOR));
    p.ring.forEach((a, i) => shell.facade(a, p.ring[(i + 1) % p.ring.length], BASE + .6, p.h - 1.6, rows, 2.6, .48, .62, glass, .14));
    p.ring.forEach((a, i) => shell.facade(a, p.ring[(i + 1) % p.ring.length], 1.2, BASE - .6, 2, 3.2, .5, .62, glass, .2));
    rusticated(p.ring, shell.base, BASE);
    band(p.ring, BASE, BASE + .6, .3);
    quoins(p.ring, BASE + .6, p.h - 1.6);
    band(p.ring, p.h - 6.3, p.h - 5.9, .2);
    band(p.ring, p.h - 1.6, p.h - 1.1, .3);
    modillions(p.ring, p.h - 1.1, p.h - .75, .8, 1, .3);
    band(p.ring, p.h - .75, p.h - .15, .95, '#e3dac9');
    band(p.ring, p.h - .15, p.h + .6, -.1, brick);
  }

  // West Peachtree portico: ten columns two storeys high on a raised base,
  // carrying an entablature and balustrade, centred on the main front.
  const front = (z: number) => -12 - 10 * (z + 63) / 122; // the main block's west wall
  const z0 = -14, z1 = 10, out = 4;
  const platform: P2[] = [[front(z0) - out, z0], [front(z0), z0], [front(z1), z1], [front(z1) - out, z1]];
  shell.prism(platform, shell.base, 1.2, colours.limestone, colours.stone);
  shell.prism(platform, 8.5, 9.6, colours.stone, colours.stone);
  const disc = (x: number, z: number, r: number): P2[] => Array.from({ length: 10 }, (_, i) => [x + r * Math.cos(i * Math.PI / 5), z + r * Math.sin(i * Math.PI / 5)]);
  for (let i = 0; i < 10; i++) {
    const z = z0 + .8 + i * (z1 - z0 - 1.6) / 9;
    shell.prism(disc(front(z) - out + .7, z, .42), 1.2, 8.5, '#e6dfd1', '#e6dfd1');
  }
  for (let i = 0; i <= 24; i++) {
    const z = z0 + i * (z1 - z0) / 24;
    shell.prism(disc(front(z) - out + .25, z, .12), 9.6, 10.5, colours.stone, colours.stone);
  }
  shell.prism(platform.map(([x, z]) => [x + (x < front(z) - 1 ? .15 : 0), z] as P2), 10.5, 10.75, colours.stone, colours.stone);

  // The WSB masts, 95 m apart on the main roof (312 ft 6 in on the 1925 photographs).
  const roof = parts.find(p => p.id === 'osm:way:42792956')?.h ?? 56;
  const neon = new Builder();
  for (const z of [-47.5, 47.5]) mast(-5, z, roof, 46, neon);

  function mast(cx: number, cz: number, base: number, height: number, glow: Builder) {
    const half = (t: number) => 2 - 1.6 * t; // 4 m square at the roof to 0.8 m at the top
    const leg = (sx: number, sz: number, t: number) => [cx + sx * half(t), base + height * t, cz + sz * half(t)];
    // Two crossed ribbons, each widened across the member: a ribbon widened
    // along the member's own direction is degenerate and yields NaN normals.
    const bar = (p: number[], q: number[], colour: string) => {
      const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], len = Math.hypot(...d);
      const u = d.map(v => v / len);
      const ref = Math.abs(u[1]) > .9 ? [1, 0, 0] : [0, 1, 0];
      const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const n1 = cross(u, ref), l1 = Math.hypot(...n1), w1 = n1.map(v => .12 * v / l1);
      const n2 = cross(u, n1), l2 = Math.hypot(...n2), w2 = n2.map(v => .12 * v / l2);
      for (const w of [w1, w2]) shell.body.quad(p.map((v, i) => v - w[i]), p.map((v, i) => v + w[i]),
        q.map((v, i) => v + w[i]), q.map((v, i) => v - w[i]), colour);
    };
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const levels = 12;
    for (let k = 0; k < levels; k++) {
      const t = k / levels, s = (k + 1) / levels;
      const colour = k >= levels - 4 && k % 2 === 0 ? '#c8352b' : '#e9e6df';
      corners.forEach(([sx, sz], i) => {
        const [nx, nz] = corners[(i + 1) % 4];
        bar(leg(sx, sz, t), leg(sx, sz, s), colour);
        bar(leg(sx, sz, s), leg(nx, nz, s), colour);
        bar(leg(sx, sz, t), leg(nx, nz, s), colour);
      });
    }
    // Vertical BILTMORE on the east and west faces, red by day and neon at night.
    const word = 'BILTMORE', pitch = 4, cell = .42;
    [...word].forEach((ch, n) => {
      const top = base + 41 - n * pitch;
      GLYPHS[ch].forEach((row, r) => [...row].forEach((on, c) => {
        if (on !== '1') return;
        const y = top - r * cell, zc = cz + (c - 2) * cell;
        for (const side of [-1, 1]) {
          const x = cx + side * (half((y - base) / height) + .05);
          const quad = (b: Builder, o: number, colour: string) => b.quad([x + side * o, y - cell, zc - cell / 2], [x + side * o, y - cell, zc + cell / 2],
            [x + side * o, y, zc + cell / 2], [x + side * o, y, zc - cell / 2], colour);
          quad(shell.body, 0, '#c8352b');
          quad(glow, .04, '#ff3b2f');
        }
      }));
    });
  }

  const model = shell.finish('#ffd9a0', .7);
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false });
  const letters = new THREE.Mesh(neon.geometry(), material);
  letters.name = 'Biltmore letters';
  letters.visible = false;
  model.group.add(letters);
  return { ...model, setNight(night: number) {
    model.setNight(night);
    material.color.setScalar(Math.min(1, night));
    letters.visible = night > .001;
  } };
}
