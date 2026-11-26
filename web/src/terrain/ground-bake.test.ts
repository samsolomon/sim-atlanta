import { existsSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, expect, it } from 'vitest';
import { bakeFile, bakeStats, decodeBake, encodeBake } from './ground-bake';
import { bakeRow, dataRoot, mountRows, stubPage } from './ground-bake.node';
import type { TerrainQuality } from './surface';

const ROW = 'brookwood-south' as const;
const staged = ['downtown', 'square-board/north-band', 'square-board/midtown-south', 'square-board/midtown-central', 'square-board/midtown-upper', `square-board/${ROW}`]
  .every(d => existsSync(new URL(`scene/${d}/ground.json`, dataRoot)));
let restore = () => {};
afterEach(() => restore());

/** Everything the row draws (names, matrices, positions, normals, uvs, indices) and where its ground is, as one hash. */
async function fingerprint(quality: TerrainQuality, files = new Map<string, Uint8Array>()) {
  restore = stubPage(files);
  const mounted = await mountRows(quality, ROW);
  try {
    const area = mounted.get(ROW)!;
    let h = 2166136261;
    const mix = (v: number) => { h ^= v; h = Math.imul(h, 16777619) >>> 0; };
    const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
    const bytes = (a: ArrayLike<number>) => {
      if (a instanceof Float32Array) { const u = new Uint32Array(a.buffer, a.byteOffset, a.length); for (let i = 0; i < u.length; i++) mix(u[i]); }
      else for (let i = 0; i < a.length; i++) mix(a[i] | 0);
    };
    area.group.updateMatrixWorld(true);
    area.group.traverse(o => {
      for (const c of o.name) mix(c.charCodeAt(0));
      mix(o.visible ? 1 : 0);
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      bytes(o.matrixWorld.elements.map(v => Math.round(v * 1e4)));
      for (const name of ['position', 'normal', 'uv']) { const a = m.geometry.getAttribute(name); if (a) bytes(a.array as Float32Array); }
      if (m.geometry.index) bytes(m.geometry.index.array as Uint32Array);
      const im = o as THREE.InstancedMesh;
      if (im.isInstancedMesh) { mix(im.count); bytes((im.instanceMatrix.array as Float32Array).subarray(0, 16 * im.count)); }
    });
    // Where things land: the drawn ground on a 7 m grid, and what was carved.
    const b = { minX: -1000, maxX: 1800, minZ: -4900, maxZ: -4100 };
    for (let x = b.minX; x <= b.maxX; x += 7) for (let z = b.minZ; z <= b.maxZ; z += 7) { f32[0] = area.groundAt(x, z) ?? NaN; mix(u32[0]); }
    mix(area.carved.length);
    return h.toString(16);
  } finally { for (const a of mounted.values()) a.dispose(); restore(); restore = () => {}; }
}

// High re-cuts twice; its first stage is a surface by size, and a tape when forced (the High drape reads).
it.skipIf(!staged).each([['low', 'smaller'], ['high', 'smaller'], ['high', 'always']] as const)('a baked Midtown row draws exactly what the in-browser build draws (%s, tapes %s)', async (quality, tapes) => {
  restore = stubPage();
  const { baked, file } = await bakeRow(quality, ROW, tapes);
  if (tapes === 'always') expect(baked.stages[0].tape?.length).toBeGreaterThan(0);
  restore();
  // The mount re-cuts its ground (golf, yards, decks...) at least once.
  expect(baked.stages.length).toBeGreaterThanOrEqual(1);
  expect(decodeBake(file.slice().buffer)).toEqual(baked);
  const path = `scene/square-board/${ROW}/${bakeFile(quality)}`;
  const plain = await fingerprint(quality);
  const before = { ...bakeStats, reasons: [...bakeStats.reasons] };
  const withBake = await fingerprint(quality, new Map([[path, file]]));
  expect(bakeStats.reasons.slice(before.reasons.length)).toEqual([]);
  expect(bakeStats.adopted).toBe(before.adopted + 1);
  expect(withBake).toBe(plain);
  // A stale bake (here: one sample recorded differently) falls back to the in-browser build, and is still exact.
  // A stale bake: a tape read recorded differently, or (with no tape) a different yield set.
  const stages = baked.stages.map(st => ({ ...st, tape: st.tape?.slice() }));
  const taped = stages.find(st => st.tape?.length);
  if (taped) taped.tape![3] += 0.25; else stages[stages.length - 1].yieldRingSum += 1;
  const stale = { ...baked, stages };
  const withStale = await fingerprint(quality, new Map([[path, encodeBake(stale)]]));
  expect(bakeStats.fallbacks).toBe(before.fallbacks + 1);
  expect(bakeStats.adopted).toBe(before.adopted + 1);
  expect(withStale).toBe(plain);
}, 600_000);
