/** The baked downtown rail profiles (pipeline/src/scene.rs) and its coordinate system. */

export interface Profile {
  s0: number;
  step: number;
  z: number[];
}

export interface SceneManifest {
  name: string;
  origin: { lon: number; lat: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
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

