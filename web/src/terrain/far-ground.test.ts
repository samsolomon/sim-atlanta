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

it('keeps joins and openings exact in the far mesh', async () => {
  const { bounds, joins } = await import('../square-board/sections');
  const b = bounds['midtown-south'];
  // A synthetic open cut across the board, like a rail opening, 10 m wide.
  const z = (b.minZ + b.maxZ) / 2;
  const slot = { start: [b.minX + 300, 230, z] as const, end: [b.minX + 700, 228, z + 40] as const, halfWidthM: 5 };
  const near = new GroundSurface(grid('square-board/midtown-south'), 'low', [slot], joins('midtown-south'));
  const far = near.farGeometry(2);
  expect(Math.abs(openLength(far) - openLength(near.geometry))).toBeLessThan(1);
  expect(far.index!.count).toBeLessThan(near.geometry.index!.count * 0.4);
});

it('swaps a low board to its far ground by distance, with hysteresis, and flags the shadow map', async () => {
  const { vi } = await import('vitest');
  const { PerspectiveCamera } = await import('three');
  const { createDowntownTerrain, takeGroundLodChange, FAR_GROUND_M } = await import('./model');
  const { bounds } = await import('../square-board/sections');
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  try {
    const b = bounds['south-corner'];
    const area = createDowntownTerrain(grid('square-board/south-corner'), { bounds: b, buildings: [], roads: [], rail: [] }, [], { quality: 'low' });
    const near = area.board.geometry, camera = new PerspectiveCamera();
    takeGroundLodChange();
    const at = (d: number) => { camera.position.set(b.maxX + d, 0, b.minZ); area.update(0, camera); return area.board.geometry; };
    expect(at(FAR_GROUND_M - 10)).toBe(near);
    const far = at(FAR_GROUND_M + 10);
    expect(far).not.toBe(near);
    expect(takeGroundLodChange()).toBe(true);
    expect(at(FAR_GROUND_M * 0.95)).toBe(far);          // inside the band: stays far
    expect(takeGroundLodChange()).toBe(false);
    expect(at(FAR_GROUND_M * 0.85)).toBe(near);
    // Placement keeps the near triangles whatever is drawn.
    at(FAR_GROUND_M + 10);
    expect(area.groundAt(b.minX + 50, b.minZ + 20)).toBe(area.terrainAt(b.minX + 50, b.minZ + 20));
    area.dispose();
  } finally { vi.unstubAllGlobals(); }
});

/** Largest height of the far mesh above the DEM at any node it covers, and the plan box of the worst. */
function aboveDem(g: BufferGeometry, path: string) {
  const gr = grid(path), { rows, cols, stepM, bounds } = gr.manifest;
  const p = g.getAttribute('position'), idx = g.index!;
  let worst = 0, at: [number, number] = [0, 0];
  for (let n = 0; n < idx.count; n += 3) {
    const [a, b, c] = [0, 1, 2].map(e => idx.getX(n + e));
    const ax = p.getX(a), az = p.getZ(a), dx = p.getX(b) - ax, dz = p.getZ(b) - az, ex = p.getX(c) - ax, ez = p.getZ(c) - az;
    const det = dx * ez - dz * ex; if (Math.abs(det) < 1e-9) continue;
    const xs = [ax, p.getX(b), p.getX(c)], zs = [az, p.getZ(b), p.getZ(c)];
    for (let r = Math.max(0, Math.ceil((Math.min(...zs) - bounds.minZ) / stepM)); r <= Math.min(rows - 1, Math.floor((Math.max(...zs) - bounds.minZ) / stepM)); r++)
      for (let col = Math.max(0, Math.ceil((Math.min(...xs) - bounds.minX) / stepM)); col <= Math.min(cols - 1, Math.floor((Math.max(...xs) - bounds.minX) / stepM)); col++) {
        const h = gr.node(r, col); if (h === null) continue;
        const x = bounds.minX + col * stepM, z = bounds.minZ + r * stepM;
        const wb = ((x - ax) * ez - (z - az) * ex) / det, wc = (dx * (z - az) - dz * (x - ax)) / det, wa = 1 - wb - wc;
        if (Math.min(wa, wb, wc) < -1e-6) continue;
        const up = wa * p.getY(a) + wb * p.getY(b) + wc * p.getY(c) - (h - gr.manifest.vertical.sceneZeroNavd88M);
        if (up > worst) { worst = up; at = [x, z]; }
      }
  }
  return { worst, at };
}

it('settles the very-far ground below the DEM with exact rims, at a fifth of the far triangles', async () => {
  const { VERY_FAR_ERROR_M } = await import('./model');
  let far = 0, very = 0, rimWorst = 0, interiorWorst = 0, mb = 0;
  for (const path of boards) {
    const near = new GroundSurface(grid(path), 'low');
    const f = near.farGeometry(2), v = near.farGeometry(VERY_FAR_ERROR_M, 160, true), raw = near.farGeometry(VERY_FAR_ERROR_M);
    far += f.index!.count / 3; very += v.index!.count / 3;
    mb += (Object.values(v.attributes).reduce((t, a) => t + (a as { array: ArrayLike<number> & { byteLength: number } }).array.byteLength, 0) + v.index!.array.byteLength) / 2 ** 20;
    // Same rim, voids and openings: no crack against any neighbour or level.
    expect(Math.abs(openLength(v) - openLength(near.geometry)), path).toBeLessThan(1);
    const { bounds, stepM } = near.grid.manifest;
    const { worst, at } = aboveDem(v, path);
    const nearRim = Math.min(at[0] - bounds.minX, bounds.maxX - at[0], at[1] - bounds.minZ, bounds.maxZ - at[1]) <= 160 + stepM;
    if (nearRim) rimWorst = Math.max(rimWorst, worst); else interiorWorst = Math.max(interiorWorst, worst);
    if (process.env.RIMS && worst > 1) console.log('RIM', path, worst.toFixed(2), at.map(Math.round).join(','));
    // Rim vertices are exact: the same heights as the far level along every board edge.
    const rim = (g: BufferGeometry) => { const p = g.getAttribute('position'), m = new Map<string, number>();
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); if (x === bounds.minX || x === bounds.maxX || z === bounds.minZ || z === bounds.maxZ) m.set(x + ',' + z, p.getY(i)); } return m; };
    const rf = rim(raw), rv = rim(v);
    for (const [k, y] of rv) expect(y, path + ' ' + k).toBe(rf.get(k));
    f.dispose(); v.dispose(); raw.dispose(); near.geometry.dispose();
  }
  console.info('very far', { far, very, MB: +mb.toFixed(2), rimWorst: +rimWorst.toFixed(2), interiorWorst: +interiorWorst.toFixed(2) });
  expect(very).toBeLessThan(far * 0.2);
  // Away from the rim nothing stands above the DEM; the rim's fixed nodes can leave a residue.
  expect(interiorWorst).toBeLessThan(0.05);
  expect(rimWorst).toBeLessThanOrEqual(VERY_FAR_ERROR_M);
}, 300_000);
