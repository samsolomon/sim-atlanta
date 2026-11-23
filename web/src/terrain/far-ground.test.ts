import { readFileSync } from 'node:fs';
import type { BufferGeometry } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from './grid';
import { GroundSurface } from './surface';

const source = new URL('../../../pipeline/prototypes/', import.meta.url);
const boards = ['downtown-ground', 'king-memorial/ground', 'sweet-auburn/ground',
  ...['north-band', 'north-corner', 'south-band', 'south-corner', 'midtown-south', 'midtown-central', 'midtown-upper', 'brookwood-south', 'brookwood-station']
    .map(id => 'square-board/' + id)];
const grid = (path: string) => new GroundGrid(JSON.parse(readFileSync(new URL(path + '/ground.json', source), 'utf8')),
  Uint8Array.from(readFileSync(new URL(path + '/ground.i16', source))).buffer);

/** Plan length of edges used by exactly one triangle: the rim, voids and openings. A crack adds more. */
function openLength(g: BufferGeometry) {
  const idx = g.index!, p = g.getAttribute('position');
  const key = (i: number) => `${p.getX(i).toFixed(2)},${p.getZ(i).toFixed(2)}`;
  const edges = new Map<string, [number, number]>();
  for (let n = 0; n < idx.count; n += 3) for (let e = 0; e < 3; e++) {
    const i = idx.getX(n + e), j = idx.getX(n + (e + 1) % 3), a = key(i), b = key(j), k = a < b ? a + '|' + b : b + '|' + a;
    edges.set(k, [(edges.get(k)?.[0] ?? 0) + 1, Math.hypot(p.getX(i) - p.getX(j), p.getZ(i) - p.getZ(j))]);
  }
  return [...edges.values()].filter(([c]) => c === 1).reduce((s, [, l]) => s + l, 0);
}

/** Largest gap between the near (drawn) surface and the far mesh, at every near vertex. */
function maxGap(near: GroundSurface, far: BufferGeometry, cell = 40) {
  const p = far.getAttribute('position'), idx = far.index!, buckets = new Map<string, number[]>();
  for (let n = 0; n < idx.count; n += 3) {
    const xs = [0, 1, 2].map(e => p.getX(idx.getX(n + e))), zs = [0, 1, 2].map(e => p.getZ(idx.getX(n + e)));
    for (let bx = Math.floor(Math.min(...xs) / cell); bx <= Math.floor(Math.max(...xs) / cell); bx++)
      for (let bz = Math.floor(Math.min(...zs) / cell); bz <= Math.floor(Math.max(...zs) / cell); bz++) {
        const k = bx + ',' + bz; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k)!.push(n);
      }
  }
  const at = (x: number, z: number) => {
    for (const n of buckets.get(Math.floor(x / cell) + ',' + Math.floor(z / cell)) ?? []) {
      const [a, b, c] = [0, 1, 2].map(e => idx.getX(n + e));
      const ax = p.getX(a), az = p.getZ(a), dx = p.getX(b) - ax, dz = p.getZ(b) - az, ex = p.getX(c) - ax, ez = p.getZ(c) - az;
      const det = dx * ez - dz * ex; if (Math.abs(det) < 1e-9) continue;
      const wb = ((x - ax) * ez - (z - az) * ex) / det, wc = (dx * (z - az) - dz * (x - ax)) / det, wa = 1 - wb - wc;
      if (Math.min(wa, wb, wc) >= -1e-6) return wa * p.getY(a) + wb * p.getY(b) + wc * p.getY(c);
    }
    return null;
  };
  const q = near.geometry.getAttribute('position');
  let worst = 0;
  for (let i = 0; i < q.count; i++) { const y = at(q.getX(i), q.getZ(i)); if (y !== null) worst = Math.max(worst, Math.abs(y - q.getY(i))); }
  return worst;
}

it('builds a far ground mesh per board that is crack-free and within its error bound', () => {
  const rows: string[] = [];
  const totals: Record<string, number> = { near: 0, 1: 0, 2: 0, 3: 0 };
  let mb = 0;
  for (const path of boards) {
    const near = new GroundSurface(grid(path), 'low');
    const n = near.geometry.index!.count / 3;
    totals.near += n;
    const row = [path.padEnd(32), String(n).padStart(8)];
    for (const e of [1, 2, 3]) {
      const far = near.farGeometry(e);
      const t = far.index!.count / 3;
      totals[e] += t;
      row.push(String(t).padStart(8));
      if (e === 2) {
        // Same rim, voids and openings as the near mesh: no crack between boards or LODs.
        expect(Math.abs(openLength(far) - openLength(near.geometry)), path).toBeLessThan(1);
        // Error: cells that fan to finer neighbours can add their centre's deviation, so 2E.
        expect(maxGap(near, far), path).toBeLessThanOrEqual(2 * e + 0.2 + 1e-6);
        mb += (far.getAttribute('position').array.byteLength * 3 + far.index!.array.byteLength) / 2 ** 20;
      }
    }
    rows.push(row.join(''));
  }
  console.log(['board'.padEnd(32) + 'near low'.padStart(8) + '   E=1m' + '   E=2m' + '   E=3m', ...rows,
    'total'.padEnd(32) + [totals.near, totals[1], totals[2], totals[3]].map(v => String(v).padStart(8)).join(''),
    `far geometry at E=2 m: ${mb.toFixed(1)} MB (position, normal, uv, index)`].join('\n'));
  expect(totals[2]).toBeLessThan(totals.near * 0.4);
}, 120_000);
