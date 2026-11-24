/**
 * Main-thread side of the mid-ring LOD: a Worker client and the per-area mesh group.
 * All LOD meshes share materials whose shader matches the board skirts' (vertex-coloured,
 * double-sided Lambert, no clipping), so the LOD adds no shader program.
 */
import * as THREE from 'three';
import type { LodOptions, LodPart, LodResult } from './lod-build';
import type { LodRequest, LodResponse } from './lod-worker';

export class LodWorker {
  private worker?: Worker;
  private seq = 0;
  private pending = new Map<number, { resolve: (r: { result: LodResult; bytes: number }) => void; reject: (e: Error) => void }>();
  private start() {
    if (this.worker) return this.worker;
    const w = new Worker(new URL('./lod-worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<LodResponse>) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      this.pending.delete(e.data.id);
      if (e.data.ok) p.resolve({ result: e.data.result, bytes: e.data.bytes });
      else p.reject(Error(e.data.error));
    };
    w.onerror = e => { for (const p of this.pending.values()) p.reject(Error(e.message)); this.pending.clear(); };
    return (this.worker = w);
  }
  build(path: string, options: LodOptions) {
    const id = ++this.seq;
    const url = new URL(path, location.href).href;
    return new Promise<{ result: LodResult; bytes: number }>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.start().postMessage({ id, path: url, options } satisfies LodRequest);
    });
  }
  dispose() { this.worker?.terminate(); this.worker = undefined; this.pending.clear(); }
}

export function lodMaterials() {
  const make = () => new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  return { ground: make(), blocks: make(), forest: make() };
}
export type LodMaterials = ReturnType<typeof lodMaterials>;

function geometry(p: LodPart) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p.position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(p.normal, 3));
  g.setAttribute('color', new THREE.BufferAttribute(p.color, 3));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

export interface LodArea {
  id: string;
  group: THREE.Group;
  ground: THREE.Mesh;
  triangles: number;
  bytes: number;
  groundAt(x: number, z: number): number | null;
  dispose(): void;
}

/** One mesh per part, so the loader can upload ground, then blocks, then forest. */
export function lodMeshes(id: string, r: LodResult, bounds: { minX: number; maxX: number; minZ: number; maxZ: number }, mats: LodMaterials) {
  const group = new THREE.Group();
  group.name = `stream LOD ${id}`;
  group.userData.perf = 'terrain';
  const mesh = (part: LodPart, mat: THREE.Material, name: string, cast: boolean) => {
    const m = new THREE.Mesh(geometry(part), mat);
    m.name = `${id} LOD ${name}`;
    m.castShadow = cast;
    m.receiveShadow = true;
    m.matrixAutoUpdate = false;
    m.userData.perf = name === 'ground' ? 'terrain' : 'scenery';
    return m;
  };
  const ground = mesh(r.ground, mats.ground, 'ground', false);
  const blocks = mesh(r.blocks, mats.blocks, 'blocks', true);
  const forest = mesh(r.forest, mats.forest, 'forest', true);
  const { heights, hCols, hRows, hStep } = r;
  const area: LodArea = {
    id, group, ground, triangles: r.stats.triangles, bytes: 0,
    groundAt(x, z) {
      const u = (x - bounds.minX) / hStep, v = (z - bounds.minZ) / hStep;
      if (!(u >= 0 && v >= 0 && u <= hCols - 1 && v <= hRows - 1)) return null;
      const i = Math.min(hCols - 2, Math.floor(u)), j = Math.min(hRows - 2, Math.floor(v));
      const fu = u - i, fv = v - j, h = (r: number, c: number) => heights[r * hCols + c];
      return (h(j, i) * (1 - fu) + h(j, i + 1) * fu) * (1 - fv) + (h(j + 1, i) * (1 - fu) + h(j + 1, i + 1) * fu) * fv;
    },
    dispose() {
      group.removeFromParent();
      for (const m of [ground, blocks, forest]) m.geometry.dispose();
      group.clear();
    },
  };
  return { area, parts: [['ground', ground], ['buildings', blocks], ['trees', forest]] as const };
}

/** Autumn and winter tint for the forest mass, so a mid-ring clump matches the near ring's season. */
export function forestTint(doy: number, out: THREE.Color) {
  // Peak colour late October to mid November, bare-ish December to March, green May to September.
  const autumn = Math.max(0, 1 - Math.abs(doy - 318) / 28);
  const winter = doy > 335 || doy < 80 ? 1 : 0;
  out.setRGB(1, 1, 1);
  if (winter) out.setRGB(0.95, 0.82, 0.70);
  else if (autumn > 0) out.setRGB(1 + 0.7 * autumn, 1 - 0.05 * autumn, 1 - 0.55 * autumn);
  return out;
}
