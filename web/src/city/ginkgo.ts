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
export const GINKGO_CLUMPS: Record<GinkgoQuality, number> = { high: 15, low: 5 };

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

export type GinkgoForm = 'young' | 'mature';
/** Old trees (age ≥ 0.5) fork low into several stems; younger ones keep one leader. */
export const ginkgoForm = (age: number): GinkgoForm => (age >= 0.5 ? 'mature' : 'young');

type V3 = [number, number, number];
interface Seg { a: V3; b: V3; r0: number; r1: number; sides: number; color: string }
interface Pad { x: number; y: number; z: number; w: number; h: number }

const BARK = '#9a948a';
const BARK_DARK = '#857f75';
const polar = (a: number, r: number, y: number): V3 => [Math.cos(a) * r, y, Math.sin(a) * r];
const lerp3 = (p: V3, q: V3, f: number): V3 => [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f];
const pad = (p: V3, w: number, h = 0.07): Pad => ({ x: p[0], y: p[1] + 0.03, z: p[2], w, h });

// Young: one grey leader with sparse limbs in loose tiers, angled up. Unit space: crown
// radius 1, height 1. Order matters: low detail keeps the first four limbs.
const YOUNG_LIMBS = [
  { y: 0.27, a: 0.3, reach: 0.9, rise: 0.22 },
  { y: 0.31, a: 3.5, reach: 0.84, rise: 0.24 },
  { y: 0.47, a: 1.9, reach: 0.72, rise: 0.2 },
  { y: 0.5, a: 5.0, reach: 0.68, rise: 0.2 },
  { y: 0.4, a: 2.6, reach: 0.62, rise: 0.26 },
  { y: 0.64, a: 0.9, reach: 0.5, rise: 0.16 },
  { y: 0.68, a: 4.2, reach: 0.46, rise: 0.15 },
];
// Mature (the High Museum tree): a short, massive trunk forking at about a fifth of the height
// into near-upright stems, with long limbs leaving them partway up toward the crown's edge.
const STEMS = [
  { a: 0.4, r: 0.5, y: 0.94 },
  { a: 2.3, r: 0.58, y: 0.86 },
  { a: 4.0, r: 0.6, y: 0.82 },
  { a: 5.4, r: 0.42, y: 0.92 },
];
const MATURE_LIMBS = [
  { stem: 0, f: 0.45, da: 0.35, reach: 0.92, lift: 0.1 },
  { stem: 1, f: 0.5, da: -0.3, reach: 0.95, lift: 0.08 },
  { stem: 2, f: 0.4, da: 0.3, reach: 0.9, lift: 0.12 },
  { stem: 3, f: 0.55, da: -0.35, reach: 0.85, lift: 0.08 },
  { stem: 1, f: 0.7, da: 0.4, reach: 0.8, lift: 0.06 },
];
const FORK: V3 = [0, 0.2, 0];

function form(kind: GinkgoForm, q: GinkgoQuality): { segs: Seg[]; pads: Pad[] } {
  const segs: Seg[] = [];
  const pads: Pad[] = [];
  if (kind === 'young') {
    const top: V3 = [0, 0.9, 0];
    segs.push({ a: [0, 0, 0], b: top, r0: 0.065, r1: 0.025, sides: 5, color: BARK_DARK });
    const limbs = q === 'high' ? YOUNG_LIMBS : YOUNG_LIMBS.slice(0, 4);
    const tips = limbs.map(l => ({ from: [0, l.y, 0] as V3, to: polar(l.a, l.reach, l.y + l.rise) }));
    for (const t of tips) segs.push({ a: t.from, b: t.to, r0: 0.03, r1: 0.012, sides: 3, color: BARK });
    pads.push(pad([0, 0.87, 0], 0.2, 0.08));
    if (q === 'high') pads.push(pad([0.04, 0.77, -0.05], 0.2));
    for (const t of tips) pads.push(pad(lerp3(t.from, t.to, 0.9), q === 'high' ? 0.22 : 0.3));
    if (q === 'high') for (const t of tips.slice(0, 6)) pads.push(pad(lerp3(t.from, t.to, 0.52), 0.2));
    return { segs, pads };
  }
  segs.push({ a: [0, 0, 0], b: FORK, r0: 0.08, r1: 0.065, sides: 5, color: BARK_DARK });
  const stems = (q === 'high' ? STEMS : STEMS.slice(0, 3)).map(st => polar(st.a, st.r, st.y));
  for (const tip of stems) segs.push({ a: FORK, b: tip, r0: 0.04, r1: 0.014, sides: 3, color: BARK_DARK });
  const limbs = (q === 'high' ? MATURE_LIMBS : MATURE_LIMBS.slice(0, 1)).map(l => {
    const from = lerp3(FORK, stems[l.stem], l.f);
    return { from, to: polar(STEMS[l.stem].a + l.da, l.reach, from[1] + l.lift) };
  });
  for (const l of limbs) segs.push({ a: l.from, b: l.to, r0: 0.025, r1: 0.01, sides: 3, color: BARK });
  if (q === 'high') {
    for (const tip of stems) pads.push(pad(lerp3(FORK, tip, 0.94), 0.22, 0.08));
    for (const l of limbs) pads.push(pad(lerp3(l.from, l.to, 0.88), 0.22));
    for (const tip of stems) pads.push(pad(lerp3(FORK, tip, 0.66), 0.2));
    pads.push(pad([0.05, 0.98, 0.02], 0.2, 0.07), pad([-0.45, 0.66, -0.4], 0.2));
  } else {
    for (const tip of stems) pads.push(pad(lerp3(FORK, tip, 0.85), 0.34, 0.1));
    for (const l of limbs) pads.push(pad(lerp3(l.from, l.to, 0.85), 0.32));
    pads.push(pad([0, 0.95, 0], 0.28, 0.09));
  }
  return { segs, pads };
}

/** Grey stems and limbs, merged into one geometry in unit space (scale by crown, height, crown). */
export function ginkgoSkeleton(kind: GinkgoForm, q: GinkgoQuality) {
  const b = new Builder();
  const up = new THREE.Vector3(0, 1, 0);
  for (const sg of form(kind, q).segs) {
    const dir = new THREE.Vector3(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1], sg.b[2] - sg.a[2]);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(sg.r1, sg.r0, len, sg.sides, 1, true).translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()));
    g.translate(...sg.a);
    b.addGeometry(g, sg.color);
  }
  return b.geometry();
}

/** Leaf clumps in unit space: one per spur-shoot tuft, on limb tips and along the stems. */
export const ginkgoPads = (kind: GinkgoForm, q: GinkgoQuality) => form(kind, q).pads;

/** Triangles per tree at a quality, by part, for the heavier of the two forms. */
export function ginkgoTriangles(q: GinkgoQuality) {
  const tris = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.attributes.position.count) / 3;
  const skeleton = Math.max(tris(ginkgoSkeleton('young', q)), tris(ginkgoSkeleton('mature', q)));
  const parts = { skeleton, leaves: GINKGO_CLUMPS[q] * tris(leafClump()), carpet: tris(carpetDisc()) };
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
 * Instanced ginkgos: at most four draws however many trees (young limbs, mature limbs,
 * leaf clumps, leaf carpet).
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
  const layouts = { young: ginkgoPads('young', quality), mature: ginkgoPads('mature', quality) };
  const n = placed.length;
  const barkMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const leafMat = new THREE.MeshLambertMaterial({ flatShading: true });
  const carpetMat = new THREE.MeshLambertMaterial({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  // One limb mesh per form present: at most four draws in all.
  const forms = placed.map(t => ginkgoForm(t.age));
  const limbs = (['young', 'mature'] as const).filter(f => forms.includes(f)).map(f => {
    const mesh = new THREE.InstancedMesh(ginkgoSkeleton(f, quality), barkMat, forms.filter(x => x === f).length);
    mesh.name = `ginkgo ${f} limbs`;
    mesh.castShadow = mesh.receiveShadow = true;
    return { form: f, mesh, next: 0 };
  });
  const leaves = new THREE.InstancedMesh(leafClump(), leafMat, n * clumps);
  const carpet = new THREE.InstancedMesh(carpetDisc(), carpetMat, n);
  leaves.name = 'ginkgo leaves';
  carpet.name = 'ginkgo carpet';
  leaves.castShadow = leaves.receiveShadow = true;
  carpet.receiveShadow = true;
  group.add(...limbs.map(l => l.mesh), leaves, carpet);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  // Each tree turns on its own; old trees spread a little wider.
  const shape = placed.map((t) => {
    const spin = rng(t.seed)() * Math.PI * 2;
    const widen = 0.85 + 0.15 * t.age;
    // Old trees carry heavier spur growth, so their tufts merge into tiers.
    const fill = 1 + 0.1 * t.age;
    return { spin, widen, fill };
  });
  const tilts: THREE.Quaternion[] = [];
  placed.forEach((t, i) => {
    q.setFromAxisAngle(up, shape[i].spin);
    m.compose(v.set(t.x, t.y, t.z), q, s.set(t.crownM * shape[i].widen, t.heightM, t.crownM * shape[i].widen));
    const set = limbs.find(l => l.form === forms[i])!;
    set.mesh.setMatrixAt(set.next++, m);
    // Tilt the carpet to the local slope so it neither floats nor sinks on Ansley Park's hills.
    const r = t.crownM;
    const gx0 = groundAt(t.x - r, t.z) ?? t.y, gx1 = groundAt(t.x + r, t.z) ?? t.y;
    const gz0 = groundAt(t.x, t.z - r) ?? t.y, gz1 = groundAt(t.x, t.z + r) ?? t.y;
    const normal = new THREE.Vector3(-(gx1 - gx0) / (2 * r), 1, -(gz1 - gz0) / (2 * r)).normalize();
    tilts.push(new THREE.Quaternion().setFromUnitVectors(up, normal));
  });
  for (const l of limbs) l.mesh.instanceMatrix.needsUpdate = true;
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
      const { spin, widen, fill } = shape[i];
      const cos = Math.cos(spin), sin = Math.sin(spin);
      for (let j = 0; j < clumps; j++, k++) {
        const p = layouts[forms[i]][j];
        const jx = (r() - 0.5) * 0.08, jz = (r() - 0.5) * 0.08;
        const rx = r() * 6.3, ry = r() * 6.3, rz = r() * 6.3;
        const shade = r();
        if (j >= keep) { leaves.setMatrixAt(k, zero); continue; }
        const ux = (p.x + jx) * widen, uz = (p.z + jz) * widen;
        const wx = ux * cos + uz * sin, wz = -ux * sin + uz * cos;
        q.setFromEuler(euler.set(rx, ry, rz));
        m.compose(v.set(t.x + wx * t.crownM, t.y + p.y * t.heightM, t.z + wz * t.crownM), q,
          s.set(p.w * t.crownM * fill, Math.max(p.h * t.heightM, p.w * t.crownM * 0.6) * fill, p.w * t.crownM * fill));
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
      for (const mesh of [...limbs.map(l => l.mesh), leaves, carpet]) { mesh.geometry.dispose(); mesh.dispose(); }
      for (const mat of [barkMat, leafMat, carpetMat]) mat.dispose();
    },
  };
}
