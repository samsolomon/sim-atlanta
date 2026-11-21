import type { RoutesFile } from '../model/types';
import { elevationAt, makeProjector, type SceneManifest } from '../core/scene-data';
import { Line, type P2 } from './geom';
import type { Alignment, VData } from './world';

/** A MARTA path through a board in scene metres, smoothed, with its baked elevation profile. */
export function alignment(rf: RoutesFile, manifest: SceneManifest, b: VData['bounds'], pathId: string): Alignment {
  const path = rf.paths.find((p) => p.id === pathId);
  if (!path) throw new Error(`missing ${pathId}`);
  const project = makeProjector(manifest.origin);
  const prof = manifest.profiles[pathId];
  const pad = 260;
  const pts: P2[] = [];
  const sAt: number[] = [];
  for (let i = 0; i < path.cum.length; i++) {
    const [x, z] = project(path.coords[2 * i], path.coords[2 * i + 1]);
    if (x < b.minX - pad || x > b.maxX + pad || z < b.minZ - pad || z > b.maxZ + pad) continue;
    pts.push([x, z]);
    sAt.push(path.cum[i]);
  }
  // The GTFS shape is rounded to ~1 m with uneven spacing; resample every 2 m and smooth
  // (a ±24 m moving average, twice) so cars don't twitch at every vertex.
  const raw = new Line(pts);
  const s0 = sAt[0];
  const STEP = 2;
  const n = Math.floor(raw.length / STEP) + 1;
  let xs = new Float64Array(n);
  let zs = new Float64Array(n);
  let es = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = raw.at(i * STEP);
    xs[i] = p.x;
    zs[i] = p.z;
    es[i] = elevationAt(prof, s0 + i * STEP);
  }
  const smooth = (a: Float64Array, half: number) => {
    const out = new Float64Array(a.length);
    for (let i = 0; i < a.length; i++) {
      // Shrink the window near the ends so endpoints stay put.
      const h = Math.min(half, i, a.length - 1 - i);
      let sum = 0;
      for (let k = i - h; k <= i + h; k++) sum += a[k];
      out[i] = sum / (2 * h + 1);
    }
    return out;
  };
  for (let pass = 0; pass < 2; pass++) {
    xs = smooth(xs, 12);
    zs = smooth(zs, 12);
    es = smooth(es, 10);
  }
  const line = new Line(Array.from(xs, (x, i) => [x, zs[i]] as P2));
  // Elevation indexed by distance along the smoothed line.
  const scale = (n - 1) / line.length;
  return {
    line,
    elev: (s: number) => {
      const f = Math.min(Math.max(s * scale, 0), n - 1);
      const i = Math.floor(f);
      const t = f - i;
      return es[i] + (es[Math.min(i + 1, n - 1)] - es[i]) * t;
    },
  };
}
