/**
 * Ginkgo biloba, the first named species in City's canopy.
 *
 * A ginkgo reads differently from the generic leaf-clump crown: an excurrent grey leader with
 * sparse, tiered, upswept limbs and flat fan-leaf pads, so the crown stays open and taller than
 * it is wide. Its calendar is the other signature: green through October, a brilliant
 * butter-yellow in mid to late November, then a drop of only a few days that leaves a gold
 * carpet under bare grey branches. See docs/tree-species.md.
 */
import * as THREE from 'three';
import { Builder, rng } from '../vignette/geom';

export type GinkgoQuality = 'high' | 'low';

/** One ginkgo in scene metres. `age` 0 is a young, narrow tree; 1 a broad old specimen. */
export interface GinkgoTree {
  x: number;
  z: number;
  /** Total height, metres. */
  heightM: number;
  /** Crown radius, metres. */
  crownM: number;
  age: number;
  seed: number;
}

export type GinkgoStage = 'bare' | 'leafout' | 'green' | 'turning' | 'gold' | 'dropping' | 'carpet';

/** Leaf clumps per tree: smaller and more of them than the generic crown, on the same octahedron. */
export const GINKGO_CLUMPS: Record<GinkgoQuality, number> = { high: 16, low: 5 };

/**
 * Ginkgo leaf state in Atlanta on day-of-year `doy`, with a per-tree `offset` in days.
 *   leaf-out from about Mar 21, full green by Apr 20, green to Oct 31,
 *   turning Nov 1–14, butter-yellow Nov 15–25, a four-day drop, a gold carpet that fades
 *   by about Dec 11, then bare grey branches.
 * `leaves` is the fraction of crown still in leaf, `t` progress through the stage, and
 * `carpet` the strength of the fallen-leaf carpet (0 none, 1 fresh gold).
 */
export function ginkgoState(doy: number, offset = 0) {
  const d = doy + offset;
  if (d < 80 || d >= 346) return { stage: 'bare' as const, t: 0, leaves: 0, carpet: 0 };
  if (d < 110) {
    const t = (d - 80) / 30;
    return { stage: 'leafout' as const, t, leaves: 0.35 + 0.65 * t, carpet: 0 };
  }
  if (d < 305) return { stage: 'green' as const, t: 0, leaves: 1, carpet: 0 };
  if (d < 319) return { stage: 'turning' as const, t: (d - 305) / 14, leaves: 1, carpet: 0 };
  if (d < 330) return { stage: 'gold' as const, t: (d - 319) / 11, leaves: 1, carpet: 0 };
  if (d < 334) {
    const t = (d - 330) / 4;
    return { stage: 'dropping' as const, t, leaves: 1 - t, carpet: t };
  }
  const t = (d - 334) / 12;
  return { stage: 'carpet' as const, t, leaves: 0, carpet: t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6 };
}

/** Per-tree offset in days. Kept within ±3 so a street of ginkgos drops nearly together. */
export const ginkgoOffset = (seed: number) => ((seed * 9301 + 49297) % 233280) / 233280 * 6 - 3;

// Limbs in unit space: a crown of radius 1 and height 1. Each rises from the leader at `y`
// toward compass angle `a`, reaching `reach` out and `rise` up. Order matters: low quality keeps
// the first four.
const LIMBS = [
  { y: 0.27, a: 0.3, reach: 0.9, rise: 0.22 },
  { y: 0.31, a: 3.5, reach: 0.84, rise: 0.24 },
  { y: 0.47, a: 1.9, reach: 0.72, rise: 0.2 },
  { y: 0.5, a: 5.0, reach: 0.68, rise: 0.2 },
  { y: 0.4, a: 2.6, reach: 0.62, rise: 0.26 },
  { y: 0.64, a: 0.9, reach: 0.5, rise: 0.16 },
  { y: 0.68, a: 4.2, reach: 0.46, rise: 0.15 },
];
const LEADER_TOP = 0.9;
const limbsFor = (q: GinkgoQuality) => (q === 'high' ? LIMBS : LIMBS.slice(0, 4));

const BARK = '#9a948a';
const BARK_DARK = '#857f75';

/** Grey leader and limbs, merged into one geometry in unit space (scale by crown, height, crown). */
export function ginkgoSkeleton(q: GinkgoQuality) {
  const b = new Builder();
  const trunk = new THREE.CylinderGeometry(0.025, 0.065, LEADER_TOP, 5, 1, true).translate(0, LEADER_TOP / 2, 0);
  b.addGeometry(trunk, BARK_DARK);
  const up = new THREE.Vector3(0, 1, 0);
  for (const l of limbsFor(q)) {
    const dir = new THREE.Vector3(Math.cos(l.a) * l.reach, l.rise, Math.sin(l.a) * l.reach);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(0.012, 0.03, len, 3, 1, true).translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()));
    g.translate(0, l.y, 0);
    b.addGeometry(g, BARK);
  }
  return b.geometry();
}

interface Pad { x: number; y: number; z: number; w: number; h: number }
/**
 * Where the leaf clumps sit in unit space. Ginkgo leaves grow in tufts on short spur shoots
 * all along the limbs, so the crown reads as separate small clumps with sky between them,
 * not one rounded mass: one or two on the leader, one at each limb tip, more along the
 * longest lower limbs.
 */
function pads(q: GinkgoQuality): Pad[] {
  const along = (l: (typeof LIMBS)[number], f: number, w: number): Pad =>
    ({ x: Math.cos(l.a) * l.reach * f, y: l.y + l.rise * f + 0.03, z: Math.sin(l.a) * l.reach * f, w, h: 0.07 });
  const limbs = limbsFor(q);
  const out: Pad[] = [{ x: 0, y: 0.9, z: 0, w: 0.2, h: 0.08 }];
  if (q === 'high') out.push({ x: 0.04, y: 0.8, z: -0.05, w: 0.2, h: 0.07 });
  for (const l of limbs) out.push(along(l, 0.9, q === 'high' ? 0.22 : 0.3));
  if (q === 'high') for (const l of limbs) out.push(along(l, 0.52, 0.2));
  return out;
}

/** Triangles per tree at a quality, by part: limbs, leaf pads and the leaf carpet. */
export function ginkgoTriangles(q: GinkgoQuality) {
  const tris = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.attributes.position.count) / 3;
  const parts = { skeleton: tris(ginkgoSkeleton(q)), leaves: GINKGO_CLUMPS[q] * tris(leafClump()), carpet: tris(carpetDisc()) };
  return { ...parts, total: parts.skeleton + parts.leaves + parts.carpet };
}

const leafClump = () => new THREE.OctahedronGeometry(1);
const carpetDisc = () => new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2);

const LEAFOUT = new THREE.Color('#b8d46c');
const GREEN = new THREE.Color('#79ab4f');
const TURNING = new THREE.Color('#b9bf48');
const GOLD = new THREE.Color('#f1c63c');
const CARPET = new THREE.Color('#e6b83e');
const CARPET_FADED = new THREE.Color('#a8915c');

/**
 * Instanced ginkgos: three draws however many trees (limbs, leaf pads, leaf carpet).
 * `groundAt` returns the scene y under a point, or null off the board.
 */
export function createGinkgos(trees: GinkgoTree[], quality: GinkgoQuality, groundAt: (x: number, z: number) => number | null) {
  const placed = trees.flatMap((t) => {
    const y = groundAt(t.x, t.z);
    return y === null ? [] : [{ ...t, y }];
  });
  if (!placed.length) return null;
  const group = new THREE.Group();
  group.name = 'ginkgos';
  const clumps = GINKGO_CLUMPS[quality];
  const layout = pads(quality);
  const n = placed.length;
  const barkMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const leafMat = new THREE.MeshLambertMaterial({ flatShading: true });
  const carpetMat = new THREE.MeshLambertMaterial({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const limbs = new THREE.InstancedMesh(ginkgoSkeleton(quality), barkMat, n);
  const leaves = new THREE.InstancedMesh(leafClump(), leafMat, n * clumps);
  const carpet = new THREE.InstancedMesh(carpetDisc(), carpetMat, n);
  limbs.name = 'ginkgo limbs';
  leaves.name = 'ginkgo leaves';
  carpet.name = 'ginkgo carpet';
  limbs.castShadow = limbs.receiveShadow = leaves.castShadow = leaves.receiveShadow = true;
  carpet.receiveShadow = true;
  group.add(limbs, leaves, carpet);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  // Young trees are narrow; old ones spread and lean their pads outward.
  const shape = placed.map((t) => {
    const spin = rng(t.seed)() * Math.PI * 2;
    const widen = 0.85 + 0.3 * t.age;
    return { spin, widen };
  });
  const tilts: THREE.Quaternion[] = [];
  placed.forEach((t, i) => {
    q.setFromAxisAngle(up, shape[i].spin);
    m.compose(v.set(t.x, t.y, t.z), q, s.set(t.crownM, t.heightM, t.crownM));
    limbs.setMatrixAt(i, m);
    // Tilt the carpet to the local slope so it neither floats nor sinks on Ansley Park's hills.
    const r = t.crownM;
    const gx0 = groundAt(t.x - r, t.z) ?? t.y, gx1 = groundAt(t.x + r, t.z) ?? t.y;
    const gz0 = groundAt(t.x, t.z - r) ?? t.y, gz1 = groundAt(t.x, t.z + r) ?? t.y;
    const normal = new THREE.Vector3(-(gx1 - gx0) / (2 * r), 1, -(gz1 - gz0) / (2 * r)).normalize();
    tilts.push(new THREE.Quaternion().setFromUnitVectors(up, normal));
  });
  limbs.instanceMatrix.needsUpdate = true;
  // Colour every instance once so both instance-colour buffers exist before the first frame.
  for (let k = 0; k < n * clumps; k++) leaves.setColorAt(k, GREEN);
  for (let i = 0; i < n; i++) carpet.setColorAt(i, CARPET);

  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const euler = new THREE.Euler();
  const c = new THREE.Color();
  const tint = new THREE.Color();
  let shown = -1;
  function setSeason(doy: number) {
    if (doy === shown) return;
    shown = doy;
    let k = 0;
    placed.forEach((t, i) => {
      const st = ginkgoState(doy, ginkgoOffset(t.seed));
      if (st.stage === 'leafout') c.copy(LEAFOUT).lerp(GREEN, st.t);
      else if (st.stage === 'green') c.copy(GREEN);
      else if (st.stage === 'turning') {
        if (st.t < 0.5) c.copy(GREEN).lerp(TURNING, st.t * 2);
        else c.copy(TURNING).lerp(GOLD, (st.t - 0.5) * 2);
      } else c.copy(GOLD);
      const r = rng(t.seed + 11);
      const keep = Math.round(clumps * st.leaves);
      const { spin, widen } = shape[i];
      const cos = Math.cos(spin), sin = Math.sin(spin);
      for (let j = 0; j < clumps; j++, k++) {
        const p = layout[j];
        const jx = (r() - 0.5) * 0.08, jz = (r() - 0.5) * 0.08;
        const rx = r() * 6.3, ry = r() * 6.3, rz = r() * 6.3;
        const shade = r();
        if (j >= keep) { leaves.setMatrixAt(k, zero); continue; }
        const ux = (p.x + jx) * widen, uz = (p.z + jz) * widen;
        const wx = ux * cos + uz * sin, wz = -ux * sin + uz * cos;
        q.setFromEuler(euler.set(rx, ry, rz));
        m.compose(v.set(t.x + wx * t.crownM, t.y + p.y * t.heightM, t.z + wz * t.crownM), q,
          s.set(p.w * t.crownM * widen, Math.max(p.h * t.heightM, p.w * t.crownM * 0.6), p.w * t.crownM * widen));
        leaves.setMatrixAt(k, m);
        tint.copy(c).offsetHSL((shade - 0.5) * 0.02, 0, (p.y - 0.6) * 0.12 + (shade - 0.5) * 0.05);
        leaves.setColorAt(k, tint);
      }
      if (st.carpet <= 0) carpet.setMatrixAt(i, zero);
      else {
        const grow = st.stage === 'dropping' ? 0.55 + 0.45 * st.carpet : 1;
        const radius = t.crownM * 1.15 * grow * (st.stage === 'carpet' ? 0.85 + 0.15 * st.carpet : 1);
        m.compose(v.set(t.x, t.y + 0.05, t.z), tilts[i], s.set(radius, 1, radius));
        carpet.setMatrixAt(i, m);
        carpet.setColorAt(i, tint.copy(CARPET_FADED).lerp(CARPET, st.carpet));
      }
    });
    leaves.instanceMatrix.needsUpdate = true;
    carpet.instanceMatrix.needsUpdate = true;
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    if (carpet.instanceColor) carpet.instanceColor.needsUpdate = true;
  }
  setSeason(180);

  return {
    group,
    count: n,
    setSeason,
    setWet(f: number) {
      for (const mat of [barkMat, leafMat, carpetMat]) mat.color.setScalar(1 - 0.3 * f);
    },
    dispose() {
      group.removeFromParent();
      for (const mesh of [limbs, leaves, carpet]) { mesh.geometry.dispose(); mesh.dispose(); }
      for (const mat of [barkMat, leafMat, carpetMat]) mat.dispose();
    },
  };
}
