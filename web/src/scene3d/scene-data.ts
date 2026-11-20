/** Loading the baked downtown scene (pipeline/src/scene.rs) and its coordinate system. */
import * as THREE from 'three';

export interface MeshRef {
  file: string;
  vertices: number;
  indices: number;
}

export interface Profile {
  s0: number;
  step: number;
  z: number[];
}

export interface SceneManifest {
  name: string;
  origin: { lon: number; lat: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  meshes: Record<'buildings' | 'roads' | 'track', MeshRef>;
  profiles: Record<string, Profile>;
  notes: string;
  sources: { name: string; attribution?: string }[];
}

const R = 6_371_008.8;
const DEG = Math.PI / 180;

/** lon/lat → scene metres (x east, z −north). Must match `scene::project` in Rust. */
export function makeProjector(origin: { lon: number; lat: number }) {
  const k = Math.cos(origin.lat * DEG);
  return (lon: number, lat: number): [number, number] => [(lon - origin.lon) * DEG * R * k, -(lat - origin.lat) * DEG * R];
}

/**
 * Elevation (m) of a path at `s` metres. Beyond the baked range it holds the end value, so a
 * train still in a tunnel at the scene edge doesn't pop up to street level. 0 if unprofiled.
 */
export function elevationAt(p: Profile | undefined, s: number): number {
  if (!p || !p.z.length) return 0;
  const f = Math.min(Math.max((s - p.s0) / p.step, 0), p.z.length - 1);
  const i = Math.floor(f);
  const t = f - i;
  return p.z[i] + (p.z[Math.min(i + 1, p.z.length - 1)] - p.z[i]) * t;
}

/** Decode a baked mesh: [f32 pos×3n][u8 col×3n, padded to 4][u32 idx×m]. */
export function decodeMesh(buf: ArrayBuffer, ref: MeshRef): THREE.BufferGeometry {
  const n = ref.vertices;
  const pos = new Float32Array(buf, 0, n * 3);
  const colStart = n * 12;
  const col = new Uint8Array(buf, colStart, n * 3);
  const idxStart = colStart + Math.ceil((n * 3) / 4) * 4;
  const idx = new Uint32Array(buf, idxStart, ref.indices);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

export async function loadScene(base: string) {
  const manifest: SceneManifest = await fetch(`${base}/scene.json`).then((r) => r.json());
  const geoms = Object.fromEntries(
    await Promise.all(
      (Object.keys(manifest.meshes) as (keyof SceneManifest['meshes'])[]).map(async (k) => {
        const ref = manifest.meshes[k];
        const buf = await fetch(`${base}/${ref.file}`).then((r) => r.arrayBuffer());
        return [k, decodeMesh(buf, ref)] as const;
      }),
    ),
  ) as Record<keyof SceneManifest['meshes'], THREE.BufferGeometry>;
  return { manifest, geoms };
}
