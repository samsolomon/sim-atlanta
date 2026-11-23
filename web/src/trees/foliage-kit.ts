/**
 * Species-independent foliage builders shared by the lab's rendering options. Sprays are foliage
 * laid along limbs: branch sleeves, flame tufts and spray cards, plus the fan-leaf chip. Each
 * species keeps its own skeleton, sprays, shading, atlas and calendar (ginkgo-variants.ts).
 */
import * as THREE from 'three';
import { Builder } from '../vignette/geom';
import type { V3 } from './species';

/** Vertex shade for a spray from its depth (0 core, 1 rim) and how far it points up. */
export type SprayShade = (depth: number, up: number) => THREE.Color;

/**
 * Guardrails for per-leaf extras (ginkgo C4 fan tips, species leaf tips): at most this many
 * trees carry them, nearest first and within this range of the camera; none at low detail.
 */
export const TIP_CAP = 8;
export const TIP_RANGE_M = 45;

// ---- sprays --------------------------------------------------------------------------------

/** One foliage spray: from `base`, along unit direction `dir`, `len` long and `w` wide (unit space). */
export interface Spray { base: V3; dir: V3; len: number; w: number; depth: number }

/** Frame for a spray: unit vectors along it and across it, in unit space (pre-scale). */
export function sprayFrame(s: Spray) {
  const along = new THREE.Vector3(...s.dir);
  const across = new THREE.Vector3(-along.z, 0, along.x).normalize();
  if (across.lengthSq() < 1e-6) across.set(1, 0, 0);
  const normal = new THREE.Vector3().crossVectors(along, across).normalize();
  return { along, across, normal };
}
export const sprayAt = (s: Spray, f: number, x: number, n: number, fr: ReturnType<typeof sprayFrame>) =>
  new THREE.Vector3(...s.base).addScaledVector(fr.along, s.len * f).addScaledVector(fr.across, x).addScaledVector(fr.normal, n);

/** Branch sleeves: a three-sided sheath per spray, widest a third of the way out, tip swept up. 6 triangles. */
export function sleeves(sprays: Spray[], shade: SprayShade) {
  const b = new Builder();
  for (const s of sprays) {
    const fr = sprayFrame(s);
    const root = sprayAt(s, -0.08, 0, 0, fr), tip = sprayAt(s, 1, 0, 0, fr);
    const ring = [[1, -0.3], [0, 0.8], [-1, -0.3]].map(([x, n]) => sprayAt(s, 0.36, x * s.w, n * s.w, fr));
    const c = shade(s.depth, s.dir[1]);
    for (let i = 0; i < 3; i++) {
      const p = ring[i], q = ring[(i + 1) % 3];
      // Two facets per side, the upper one lighter: the crease reads under the ink.
      b.tri(tip.toArray(), p.toArray(), q.toArray(), c);
      b.tri(root.toArray(), q.toArray(), p.toArray(), c.clone().multiplyScalar(0.82));
    }
  }
  return b.geometry();
}

/** Flame tufts: two stacked upward flames per spray, each a three-sided pyramid without a base. 6 triangles. */
export function flames(sprays: Spray[], shade: SprayShade) {
  const b = new Builder();
  for (const s of sprays) {
    const fr = sprayFrame(s);
    const c = shade(s.depth, s.dir[1]);
    for (const [f0, f1, wk] of [[0, 0.62, 1], [0.42, 1.05, 0.7]] as const) {
      const apex = sprayAt(s, f1, 0, 0, fr).add(new THREE.Vector3(0, s.len * 0.12, 0));
      const ring = [[1, -0.4], [0, 1], [-1, -0.4]].map(([x, n]) => sprayAt(s, f0, x * s.w * wk, n * s.w * wk * 0.8, fr));
      for (let i = 0; i < 3; i++) b.tri(apex.toArray(), ring[i].toArray(), ring[(i + 1) % 3].toArray(), i % 2 ? c.clone().multiplyScalar(0.85) : c);
    }
  }
  return b.geometry();
}

/** Spray cards: two crossed cards per spray, UVs into a two-column atlas. 4 triangles. */
export function sprayCards(sprays: Spray[], shade: SprayShade) {
  const pos: number[] = [], uv: number[] = [], col: number[] = [];
  sprays.forEach((s, k) => {
    const fr = sprayFrame(s);
    const c = shade(s.depth, s.dir[1]);
    const u0 = (k % 2) * 0.5;
    for (const side of [fr.across, fr.normal]) {
      const w = s.w * 1.5;
      const p = [sprayAt(s, -0.05, 0, 0, fr).addScaledVector(side, -w), sprayAt(s, -0.05, 0, 0, fr).addScaledVector(side, w),
        sprayAt(s, 1.05, 0, 0, fr).addScaledVector(side, w), sprayAt(s, 1.05, 0, 0, fr).addScaledVector(side, -w)];
      const t = [[u0, 0], [u0 + 0.5, 0], [u0 + 0.5, 1], [u0, 1]];
      for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...p[i].toArray()); uv.push(...t[i]); col.push(c.r, c.g, c.b); }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** A fan leaf (ginkgo) as a three-triangle fan, about 1 unit across, stem at the origin. */
export function fanGeometry() {
  const g = new THREE.BufferGeometry();
  const pts = [[0, 0, 0], [-0.5, 0.75, 0], [-0.18, 0.95, 0], [0.18, 0.95, 0], [0.5, 0.75, 0]];
  const pos: number[] = [];
  for (let i = 1; i < 4; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}


