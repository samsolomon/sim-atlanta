import { readFileSync } from 'node:fs';
import type { BufferGeometry } from 'three';
import { it } from 'vitest';
import { GroundGrid } from './grid';
import { GroundSurface } from './surface';
import { Line } from '../vignette/geom';
const source = new URL('../../../pipeline/prototypes/', import.meta.url);
const allBoards = ['north-band', 'south-band', 'midtown-south', 'midtown-central', 'midtown-upper', 'brookwood-south', 'brookwood-station', 'north-corner'];
const boards = allBoards;
function sampler(g: BufferGeometry, cell = 40) {
  const p = g.getAttribute('position'), idx = g.index!, buckets = new Map<string, number[]>();
  for (let n = 0; n < idx.count; n += 3) {
    const xs = [0, 1, 2].map(e => p.getX(idx.getX(n + e))), zs = [0, 1, 2].map(e => p.getZ(idx.getX(n + e)));
    for (let bx = Math.floor(Math.min(...xs) / cell); bx <= Math.floor(Math.max(...xs) / cell); bx++)
      for (let bz = Math.floor(Math.min(...zs) / cell); bz <= Math.floor(Math.max(...zs) / cell); bz++) {
        const k = bx + ',' + bz; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k)!.push(n);
      }
  }
  return (x: number, z: number) => {
    for (const n of buckets.get(Math.floor(x / cell) + ',' + Math.floor(z / cell)) ?? []) {
      const [a, b, c] = [0, 1, 2].map(e => idx.getX(n + e));
      const ax = p.getX(a), az = p.getZ(a), dx = p.getX(b) - ax, dz = p.getZ(b) - az, ex = p.getX(c) - ax, ez = p.getZ(c) - az;
      const det = dx * ez - dz * ex; if (Math.abs(det) < 1e-9) continue;
      const wb = ((x - ax) * ez - (z - az) * ex) / det, wc = (dx * (z - az) - dz * (x - ax)) / det, wa = 1 - wb - wc;
      if (Math.min(wa, wb, wc) >= -1e-9) return wa * p.getY(a) + wb * p.getY(b) + wc * p.getY(c);
    }
    return null;
  };
}
it('vfar', () => {
  const rows: string[] = [];
  const tot: Record<string, number[]> = {};
  for (const id of boards) {
    const d = new URL('square-board/' + id + '/', source);
    const grid = new GroundGrid(JSON.parse(readFileSync(new URL('ground.json', d), 'utf8')), Uint8Array.from(readFileSync(new URL('ground.i16', d))).buffer);
    const ctx = JSON.parse(readFileSync(new URL('context.json', d), 'utf8'));
    const near = new GroundSurface(grid, 'low');
    for (const [err, up] of [[2, 0], [8, 0], [8, 1], [2, 1]] as const) {
      const far = near.farGeometry(err, 160, up === 1), at = sampler(far);
      const stats: Record<string, number[]> = { road: [0, 0, 0], building: [0, 0, 0] };
      for (const r of ctx.roads) {
        if (r.bridge || r.tunnel || r.pts.length < 2) continue;
        const line = new Line(r.pts);
        for (let s = 0; s <= line.length; s += 4) {
          const { x, z } = line.at(s); const n = near.sampleScene(x, z), f = at(x, z);
          if (n === null || f === null) continue;
          const st = stats.road; st[0]++; const up = f - n; if (up > 0.12) st[1]++; st[2] = Math.max(st[2], up);
        }
      }
      for (const b of ctx.buildings) for (const ring of b.rings ?? []) for (const [x, z] of ring) {
        const n = near.sampleScene(x, z), f = at(x, z); if (n === null || f === null) continue;
        const st = stats.building; st[0]++; const up = f - n; if (up > 0.5) st[1]++; st[2] = Math.max(st[2], up);
      }
      for (const [k, [n, over, max]] of Object.entries(stats)) {
        rows.push(`${id} err${err} ${k}: ${over}/${n} (${(100 * over / Math.max(1, n)).toFixed(1)}%) worst ${max.toFixed(2)} m  tris ${far.index!.count / 3}`);
        const key = `err${err}/up${up} ${k}`; tot[key] ??= [0, 0, 0]; tot[key][0] += n; tot[key][1] += over; tot[key][2] = Math.max(tot[key][2], max);
      }
      far.dispose();
    }
    near.geometry.dispose();
  }
  console.log(rows.join('\n'));
  for (const [k, [n, o, m]] of Object.entries(tot)) console.log('TOTAL', k, `${o}/${n} (${(100 * o / n).toFixed(1)}%) worst ${m.toFixed(2)}`);
}, 600000);
