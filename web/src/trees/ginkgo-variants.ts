/**
 * Four candidate ways to draw a ginkgo's foliage, for Sam to compare in the model lab before
 * one goes to City (docs/tree-species.md#four-ginkgo-renderings). All four share the limb
 * skeleton, the season calendar, the drop-day gold carpet and a few falling leaves at near
 * range. Ginkgo foliage follows the main limbs as dense, upswept sprays, so every variant
 * hangs its foliage on the same list of sprays laid along the limbs:
 *
 *   A  Branch sleeves: tapered faceted sheaths, one per spray, creased where sprays meet.
 *   B  Micro-fans: hundreds of three-triangle fan chips on spur shoots (near only; swaps to A).
 *   C  Leaf cards: crossed alpha-cutout cards painted with fan leaves, with sky between.
 *   D  Flame tufts: stacked upward flame facets in tiers, storybook and cheap.
 *
 * Lab only: City keeps `ginkgo.ts` until Sam picks.
 */
import * as THREE from 'three';
import { Builder, rng } from '../vignette/geom';
import { inkFoliage, type InkFoliageMode } from '../vignette/ink';
import { ginkgo, ginkgoState } from './ginkgo';
import { treeDims, type TreePlacement } from './render';
import { hash01, lerp3, polar, trunkRadius, type Dims, type SizeClass, type TreeQuality, type V3 } from './species';

export type GinkgoVariant = 'A' | 'B' | 'C' | 'D' | 'C1' | 'C2' | 'C3' | 'C4';
/** The leaf-card family Sam picked, by how the ink pass treats the crown (vignette/ink.ts). */
export const C_FAMILY: GinkgoVariant[] = ['C', 'C1', 'C2', 'C3', 'C4'];
const INK_MODE: Partial<Record<GinkgoVariant, InkFoliageMode>> = { C1: 1, C2: 2, C3: 3, C4: 2 };
/** C4: at most this many trees, nearest first and within `tipRangeM`, carry fan tips; none at low detail. */
export const TIP_CAP = 8;
export const TIP_RANGE_M = 45;
export const VARIANTS: Record<GinkgoVariant, string> = {
  A: 'Branch sleeves',
  B: 'Micro-fans',
  C: 'Leaf cards',
  D: 'Flame tufts',
  C1: 'Cards, silhouette ink',
  C2: 'Cards, warm silhouette ink',
  C3: 'Cards, interior ink fades by 40 m',
  C4: 'C2 + near fan tips',
};

// ---- skeleton and sprays -------------------------------------------------------------------

interface Limb { y: number; a: number; elbow: [number, number]; tip: [number, number] }
interface Shape { top: number; limbs: Limb[] }
/** Unit space: crown radius 1, height 1. Upswept limbs; the specimen forks low into scaffolds. */
const SHAPES: Record<'young' | 'mature' | 'specimen', Shape> = {
  young: {
    top: 1, limbs: [
      { y: 0.3, a: 0.3, elbow: [0.42, 0.45], tip: [0.8, 0.62] },
      { y: 0.38, a: 3.3, elbow: [0.38, 0.52], tip: [0.76, 0.68] },
      { y: 0.52, a: 1.8, elbow: [0.3, 0.64], tip: [0.6, 0.8] },
      { y: 0.62, a: 4.8, elbow: [0.22, 0.74], tip: [0.46, 0.9] },
    ],
  },
  mature: {
    top: 0.9, limbs: [
      { y: 0.28, a: 0.3, elbow: [0.4, 0.46], tip: [0.86, 0.72] },
      { y: 0.34, a: 3.4, elbow: [0.38, 0.52], tip: [0.84, 0.78] },
      { y: 0.44, a: 1.9, elbow: [0.32, 0.62], tip: [0.72, 0.88] },
      { y: 0.5, a: 4.9, elbow: [0.3, 0.68], tip: [0.66, 0.94] },
    ],
  },
  specimen: {
    top: 0.2, limbs: [
      { y: 0.2, a: 0.4, elbow: [0.44, 0.36], tip: [0.9, 0.66] },
      { y: 0.2, a: 2.1, elbow: [0.48, 0.32], tip: [0.92, 0.6] },
      { y: 0.2, a: 3.8, elbow: [0.42, 0.38], tip: [0.86, 0.7] },
      { y: 0.2, a: 5.3, elbow: [0.26, 0.5], tip: [0.55, 0.94] },
    ],
  },
};
const shapeOf = (size: SizeClass) => SHAPES[size === 'sapling' || size === 'young' ? 'young' : size];

/** One foliage spray: from `base`, along unit direction `dir`, `len` long and `w` wide (unit space). */
export interface Spray { base: V3; dir: V3; len: number; w: number; depth: number }

/**
 * Sprays laid along each limb's outer two thirds and up the leader, swept upward like the
 * plumes in the reference photographs. `depth` 0 is the crown's core, 1 its sunlit rim.
 */
export function ginkgoSprays(size: SizeClass, q: TreeQuality): Spray[] {
  const shape = shapeOf(size);
  const limbs = q === 'high' ? shape.limbs : shape.limbs.slice(0, 3);
  const perLimb = q === 'high' ? 4 : 2;
  const r = rng(size.length * 97 + (q === 'high' ? 3 : 5));
  const out: Spray[] = [];
  for (const l of limbs) {
    const from: V3 = [0, l.y, 0];
    const elbow = polar(l.a, l.elbow[0], l.elbow[1]);
    const tip = polar(l.a + 0.25, l.tip[0], l.tip[1]);
    for (let i = 0; i < perLimb; i++) {
      const f = 0.3 + (i + 0.5) / perLimb * 0.7;
      const at = f < 0.5 ? lerp3(from, elbow, f * 2) : lerp3(elbow, tip, (f - 0.5) * 2);
      // Out along the limb and up: the sprays sweep upward toward the crown's edge.
      const side = (i % 2 ? 1 : -1) * (0.25 + r() * 0.25);
      const outA = l.a + side;
      const lift = 0.62 + 0.25 * f;
      const dir = new THREE.Vector3(Math.cos(outA) * 0.75, lift, Math.sin(outA) * 0.75).normalize();
      out.push({ base: at, dir: [dir.x, dir.y, dir.z], len: 0.34 + r() * 0.12, w: 0.2 + r() * 0.06, depth: f });
    }
  }
  // Leader-top plumes.
  const tops = q === 'high' ? 4 : 2;
  for (let i = 0; i < tops; i++) {
    const a = i * 2.4 + r();
    const dir = new THREE.Vector3(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3).normalize();
    out.push({ base: [0, Math.max(0.55, 0.62 + i * 0.04), 0], dir: [dir.x, dir.y, dir.z], len: 0.3 + r() * 0.1, w: 0.2, depth: 0.5 + i * 0.1 });
  }
  return out;
}

/**
 * Sprays in metres at a class's nominal size, so foliage keeps its shape once an instance is
 * scaled by (crown radius, height, crown radius). Geometry built from these is scaled back to
 * unit space by `toUnit`.
 */
function metric(sprays: Spray[], size: SizeClass): { sprays: Spray[]; toUnit: (g: THREE.BufferGeometry) => THREE.BufferGeometry } {
  const d = ginkgo.sizes[size];
  const R = d.spreadM / 2, H = d.heightM;
  const L = Math.max(R, H * 0.45);
  return {
    sprays: sprays.map(s => ({ ...s, base: [s.base[0] * R, s.base[1] * H, s.base[2] * R], len: s.len * L, w: s.w * R })),
    toUnit: g => g.scale(1 / R, 1 / H, 1 / R),
  };
}

const BARK = new THREE.Color('#8f897f');
/** Limbs as tapered, slightly angular two-segment tubes, built round at nominal size. */
export function variantSkeleton(size: SizeClass, q: TreeQuality) {
  const d = ginkgo.sizes[size];
  const shape = shapeOf(size);
  const R = d.spreadM / 2, H = d.heightM;
  const tr = trunkRadius(d);
  const b = new Builder();
  const up = new THREE.Vector3(0, 1, 0);
  const seg = (a: V3, c: V3, r0: number, r1: number, sides: number) => {
    const dir = new THREE.Vector3((c[0] - a[0]) * R, (c[1] - a[1]) * H, (c[2] - a[2]) * R);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(r1 * R, r0 * R, len, sides, 1, true).translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()));
    g.translate(a[0] * R, a[1] * H, a[2] * R).scale(1 / R, 1 / H, 1 / R);
    b.addGeometry(g, BARK);
    g.dispose();
  };
  seg([0, 0, 0], [0, shape.top, 0], tr, size === 'specimen' ? tr * 0.85 : tr * 0.3, 5);
  for (const l of q === 'high' ? shape.limbs : shape.limbs.slice(0, 3)) {
    const from: V3 = [0, l.y, 0];
    const elbow = polar(l.a, l.elbow[0], l.elbow[1]);
    const tip = polar(l.a + 0.25, l.tip[0], l.tip[1]);
    const base = size === 'specimen' ? 0.7 : 0.55;
    seg(from, elbow, tr * base, tr * base * 0.6, 3);
    seg(elbow, tip, tr * base * 0.6, tr * 0.12, 3);
  }
  return b.geometry();
}

// ---- foliage geometry per variant -----------------------------------------------------------

/** Shade per vertex: sunlit rim and top bright, the core toward ochre. Multiplies the season colour. */
function shade(depth: number, up: number) {
  const k = 0.74 + 0.3 * Math.min(1, Math.max(0, depth * 0.7 + up * 0.5));
  return new THREE.Color(k, k * (0.86 + 0.14 * k), k * (0.7 + 0.3 * k));
}

/** Frame for a spray: unit vectors along it and across it, in unit space (pre-scale). */
function frame(s: Spray) {
  const along = new THREE.Vector3(...s.dir);
  const across = new THREE.Vector3(-along.z, 0, along.x).normalize();
  if (across.lengthSq() < 1e-6) across.set(1, 0, 0);
  const normal = new THREE.Vector3().crossVectors(along, across).normalize();
  return { along, across, normal };
}
const at = (s: Spray, f: number, x: number, n: number, fr: ReturnType<typeof frame>) =>
  new THREE.Vector3(...s.base).addScaledVector(fr.along, s.len * f).addScaledVector(fr.across, x).addScaledVector(fr.normal, n);

/** A: a three-sided sheath per spray, widest a third of the way out, tip swept up. 6 triangles. */
function sleeves(sprays: Spray[]) {
  const b = new Builder();
  for (const s of sprays) {
    const fr = frame(s);
    const root = at(s, -0.08, 0, 0, fr), tip = at(s, 1, 0, 0, fr);
    const ring = [[1, -0.3], [0, 0.8], [-1, -0.3]].map(([x, n]) => at(s, 0.36, x * s.w, n * s.w, fr));
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

/** D: two stacked upward flames per spray, each a three-sided pyramid without a base. 6 triangles. */
function flames(sprays: Spray[]) {
  const b = new Builder();
  for (const s of sprays) {
    const fr = frame(s);
    const c = shade(s.depth, s.dir[1]);
    for (const [f0, f1, wk] of [[0, 0.62, 1], [0.42, 1.05, 0.7]] as const) {
      const apex = at(s, f1, 0, 0, fr).add(new THREE.Vector3(0, s.len * 0.12, 0));
      const ring = [[1, -0.4], [0, 1], [-1, -0.4]].map(([x, n]) => at(s, f0, x * s.w * wk, n * s.w * wk * 0.8, fr));
      for (let i = 0; i < 3; i++) b.tri(apex.toArray(), ring[i].toArray(), ring[(i + 1) % 3].toArray(), i % 2 ? c.clone().multiplyScalar(0.85) : c);
    }
  }
  return b.geometry();
}

/** C: two crossed cards per spray with UVs into the fan-leaf atlas. 4 triangles. */
function cards(sprays: Spray[]) {
  const pos: number[] = [], uv: number[] = [], col: number[] = [];
  sprays.forEach((s, k) => {
    const fr = frame(s);
    const c = shade(s.depth, s.dir[1]);
    const u0 = (k % 2) * 0.5;
    for (const side of [fr.across, fr.normal]) {
      const w = s.w * 1.5;
      const p = [at(s, -0.05, 0, 0, fr).addScaledVector(side, -w), at(s, -0.05, 0, 0, fr).addScaledVector(side, w),
        at(s, 1.05, 0, 0, fr).addScaledVector(side, w), at(s, 1.05, 0, 0, fr).addScaledVector(side, -w)];
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

/** B: fan chips on spur shoots along each spray, as instance transforms in unit space. */
export function fanChips(unitSprays: Spray[], q: TreeQuality, size: SizeClass = 'mature') {
  const { sprays } = metric(unitSprays, size);
  const d = ginkgo.sizes[size];
  const R = d.spreadM / 2, H = d.heightM;
  const per = q === 'high' ? 20 : 8;
  const r = rng(per * 7 + sprays.length);
  const chips: { p: V3; yaw: number; tilt: number; s: number; depth: number }[] = [];
  for (const s of sprays) {
    const fr = frame(s);
    for (let i = 0; i < per; i++) {
      const f = r() * 1.05;
      const spread = s.w * (0.4 + 0.8 * Math.sin(Math.PI * Math.min(1, f)));
      const p = at(s, f, (r() - 0.5) * 2 * spread, (r() - 0.5) * 1.4 * spread, fr);
      // Chip size in metres: a spur-shoot cluster of fan leaves, about 0.3–0.5 m across.
      chips.push({ p: [p.x / R, p.y / H, p.z / R], yaw: r() * 6.3, tilt: 0.3 + r() * 0.9, s: Math.min(0.9, Math.max(0.18, R * 0.12)) * (0.8 + r() * 0.5), depth: s.depth });
    }
  }
  return chips;
}
/** C4: only the fan chips on the outer sprays, the branch tips a viewer sees first. */
export function tipChips(unitSprays: Spray[], q: TreeQuality, size: SizeClass) {
  return fanChips(unitSprays, q, size).filter((c, i) => c.depth >= 0.7 && i % 2 === 0);
}
/** A ginkgo leaf as a three-triangle fan, about 1 unit across, stem at the origin. */
export function fanGeometry() {
  const g = new THREE.BufferGeometry();
  const pts = [[0, 0, 0], [-0.5, 0.75, 0], [-0.18, 0.95, 0], [0.18, 0.95, 0], [0.5, 0.75, 0]];
  const pos: number[] = [];
  for (let i = 1; i < 4; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Fan-leaf atlas for C, painted once per page: gold fans on spur shoots, transparent between. */
let atlas: THREE.Texture | null = null;
function leafAtlas() {
  if (atlas) return atlas;
  // Outside a browser (tests) there is no canvas: a 1 × 1 opaque texel stands in.
  if (typeof document === 'undefined') return (atlas = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1));
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d')!;
  const r = rng(42);
  for (let half = 0; half < 2; half++) {
    for (let i = 0; i < 70; i++) {
      const x = half * 128 + 16 + r() * 96, y = 8 + r() * 240;
      const s = 9 + r() * 8, a = (r() - 0.5) * 1.6;
      g.save(); g.translate(x, y); g.rotate(a + Math.PI);
      g.fillStyle = `hsl(${47 + r() * 6}, 92%, ${86 - r() * 16}%)`;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-s * 0.55, s * 0.85);
      g.quadraticCurveTo(0, s * 1.15, s * 0.55, s * 0.85); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(120,90,40,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s * 0.5); g.stroke();
      g.restore();
    }
  }
  atlas = new THREE.CanvasTexture(c);
  atlas.colorSpace = THREE.SRGBColorSpace;
  return atlas;
}

/** A, C or D foliage for one size class, in unit space. */
function foliageGeometry(v: GinkgoVariant, size: SizeClass, unitSprays: Spray[]) {
  const { sprays, toUnit } = metric(unitSprays, size);
  return toUnit(v.startsWith('C') ? cards(sprays) : v === 'D' ? flames(sprays) : sleeves(sprays));
}

const tris = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.attributes.position.count) / 3;

/** Foliage triangles per tree for a variant (B counts its chips). */
export function variantTriangles(v: GinkgoVariant, size: SizeClass, q: TreeQuality) {
  const sprays = ginkgoSprays(size, q);
  const skeleton = tris(variantSkeleton(size, q));
  // B and C4 count their fans on a tree that carries them; at low detail neither draws fans.
  const fans = q === 'low' ? 0 : v === 'B' ? fanChips(sprays, q, size).length * 3 : v === 'C4' ? tipChips(sprays, q, size).length * 3 : 0;
  const foliage = (v === 'B' && q === 'high' ? 0 : tris(foliageGeometry(v === 'B' ? 'A' : v, size, sprays))) + fans;
  return { skeleton, foliage, carpet: 7, total: skeleton + foliage + 7 };
}

// ---- renderer --------------------------------------------------------------------------------

const GREEN = new THREE.Color('#7fb04f');
const LEAFOUT = new THREE.Color('#b8d46c');
const TURNING = new THREE.Color('#c2c048');
const GOLD = new THREE.Color('#f6c936');
function seasonColour(doy: number, offset: number) {
  const st = ginkgoState(doy, offset);
  const c = new THREE.Color();
  if (st.stage === 'leafout') c.copy(LEAFOUT).lerp(GREEN, st.t);
  else if (st.stage === 'green') c.copy(GREEN);
  else if (st.stage === 'turning') c.copy(GREEN).lerp(TURNING, Math.min(1, st.t * 2)).lerp(GOLD, Math.max(0, st.t * 2 - 1));
  else c.copy(GOLD);
  return { st, c };
}

/**
 * Ginkgos drawn with one variant. B swaps to A beyond `nearM` from the camera (call update()).
 * Draws: limbs and foliage per size class present, plus carpet and falling leaves.
 */
export function createGinkgoVariant(placements: TreePlacement[], variant: GinkgoVariant, quality: TreeQuality,
  groundAt: (x: number, z: number) => number | null, { nearM = 60 } = {}) {
  const trees = placements.flatMap(p => {
    const y = groundAt(p.x, p.z);
    return y === null ? [] : [{ ...p, y, dims: treeDims(p) }];
  });
  if (!trees.length) return null;
  const group = new THREE.Group();
  group.name = `ginkgo variant ${variant}`;
  const meshes: THREE.InstancedMesh[] = [];
  const bark = new THREE.MeshLambertMaterial({ vertexColors: true });
  // Foliage: vertex shade times the season colour, a little self-light for the backlit glow.
  const leafMat = (opts: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: '#6b4a00', emissiveIntensity: 0.25, ...opts });
  const isCards = variant.startsWith('C');
  // Cards are alpha-TESTED (discard), never blended: no sorting and no blended overdraw on phones.
  const foliageMat = isCards ? leafMat({ map: leafAtlas(), alphaTest: 0.5 }) : leafMat({ flatShading: true });
  const chipMat = leafMat({ vertexColors: false });
  const inkMode = INK_MODE[variant];
  if (inkMode) { inkFoliage(foliageMat, inkMode); inkFoliage(chipMat, inkMode); }
  const fansNear = variant === 'B' && quality === 'high';
  const tips = variant === 'C4' && quality === 'high';
  const carpetMat = new THREE.MeshLambertMaterial({ color: '#e6b83e', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const add = (g: THREE.BufferGeometry, m: THREE.Material, n: number, name: string) => {
    const mesh = new THREE.InstancedMesh(g, m, n);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    meshes.push(mesh);
    group.add(mesh);
    return mesh;
  };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const place = (t: (typeof trees)[number]) => {
    q.setFromAxisAngle(up, hash01(t.seed, 4) * Math.PI * 2);
    const r = t.dims.spreadM / 2;
    return m.compose(v.set(t.x, t.y, t.z), q, s.set(r, t.dims.heightM, r)).clone();
  };

  const foliageSets: { mesh: THREE.InstancedMesh; members: typeof trees }[] = [];
  const chipSets: { mesh: THREE.InstancedMesh; members: typeof trees; perTree: number; chips: ReturnType<typeof fanChips> }[] = [];
  const nearSwap: THREE.InstancedMesh[] = [];
  const tipSets: { mesh: THREE.InstancedMesh; members: typeof trees; chips: ReturnType<typeof fanChips>; slots: number }[] = [];
  let tipped: number[] = [];
  for (const size of new Set(trees.map(t => t.size))) {
    const members = trees.filter(t => t.size === size);
    const limbs = add(variantSkeleton(size, quality), bark, members.length, `${size} limbs`);
    members.forEach((t, i) => limbs.setMatrixAt(i, place(t)));
    const sprays = ginkgoSprays(size, quality);
    if (fansNear) {
      // Near: chips. Far: A's sleeves, swapped by distance in update().
      const chips = fanChips(sprays, quality, size);
      const mesh = add(fanGeometry(), chipMat, members.length * chips.length, `${size} fan chips`);
      chipSets.push({ mesh, members, perTree: chips.length, chips });
      const far = add(foliageGeometry('A', size, sprays), foliageMat, members.length, `${size} sleeves (far)`);
      members.forEach((t, i) => far.setMatrixAt(i, place(t)));
      far.visible = false;
      nearSwap.push(mesh, far);
      foliageSets.push({ mesh: far, members });
    } else {
      const g = foliageGeometry(variant === 'B' ? 'A' : variant, size, sprays);
      const mesh = add(g, foliageMat, members.length, `${size} foliage ${variant}`);
      members.forEach((t, i) => mesh.setMatrixAt(i, place(t)));
      foliageSets.push({ mesh, members });
      if (tips) {
        const chips = tipChips(sprays, quality, size);
        const slots = Math.min(members.length, TIP_CAP);
        tipSets.push({ mesh: add(fanGeometry(), chipMat, slots * chips.length, `${size} fan tips`), members, chips, slots });
      }
    }
  }
  const carpet = add(new THREE.CircleGeometry(1, 9).rotateX(-Math.PI / 2), carpetMat, trees.length, 'carpet');
  carpet.castShadow = false;
  // Falling leaves: a few fan chips per tree that drift down while the tree drops (near only).
  const FALL = quality === 'high' ? 24 : 8;
  const falling = add(fanGeometry(), chipMat, trees.length * FALL, 'falling leaves');
  falling.castShadow = false;
  const fallSeeds = Array.from({ length: trees.length * FALL }, (_, i) => [hash01(i, 21), hash01(i, 22), hash01(i, 23), hash01(i, 24)]);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const tint = new THREE.Color();
  let state = trees.map(() => ({ leaves: 1, falling: 0, c: new THREE.Color() }));

  function setSeason(doy: number) {
    state = trees.map(t => {
      const { st, c } = seasonColour(doy, (hash01(t.seed, 2) * 2 - 1) * ginkgo.offsetDays);
      const fallingNow = st.stage === 'dropping' ? 1 : st.stage === 'gold' ? 0.15 : 0;
      return { leaves: st.leaves, falling: fallingNow, c, carpet: st.carpet };
    }) as typeof state;
    // Foliage shrinks onto the limbs as it drops, then hides.
    for (const set of foliageSets) set.members.forEach((t, i) => {
      const k = trees.indexOf(t), leaves = state[k].leaves;
      if (leaves <= 0.02) { set.mesh.setMatrixAt(i, zero); return; }
      const base = place(t);
      const sk = 0.55 + 0.45 * leaves;
      set.mesh.setMatrixAt(i, base.multiply(new THREE.Matrix4().makeScale(sk, 0.8 + 0.2 * leaves, sk)));
      set.mesh.setColorAt(i, state[k].c);
    });
    writeTips();
    for (const set of chipSets) set.members.forEach((t, i) => {
      const k = trees.indexOf(t), keep = Math.round(set.perTree * state[k].leaves);
      const base = place(t);

      set.chips.forEach((ch, j) => {
        const idx = i * set.perTree + j;
        if (j >= keep) { set.mesh.setMatrixAt(idx, zero); return; }
        const p = new THREE.Vector3(...ch.p).applyMatrix4(base);
        const size = ch.s;
        q.setFromEuler(new THREE.Euler(-ch.tilt, ch.yaw + hash01(t.seed, 4) * 6.3, 0, 'YXZ'));
        set.mesh.setMatrixAt(idx, m.compose(p, q, s.set(size, size, size)));
        set.mesh.setColorAt(idx, tint.copy(state[k].c).multiplyScalar(0.82 + 0.25 * Math.min(1, ch.depth + (ch.p[1] - 0.5))));
      });
    });
    trees.forEach((t, i) => {
      const cv = (state[i] as unknown as { carpet: number }).carpet;
      if (cv <= 0) { carpet.setMatrixAt(i, zero); return; }
      const r = t.dims.spreadM / 2 * 1.15 * (0.6 + 0.4 * cv);
      carpet.setMatrixAt(i, m.compose(v.set(t.x, t.y + 0.05, t.z), q.identity(), s.set(r, 1, r)));
      carpet.setColorAt(i, tint.set('#a8915c').lerp(new THREE.Color('#e6b83e'), cv));
    });
    for (const mesh of meshes) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
  }

  /** C4: fan tips on the trees in `tipped` (indices into trees), nearest first, the rest stay cards. */
  function writeTips() {
    for (const set of tipSets) {
      const mine = tipped.filter(k => set.members.includes(trees[k])).slice(0, set.slots);
      for (let slot = 0; slot < set.slots; slot++) {
        const k = mine[slot];
        set.chips.forEach((ch, j) => {
          const idx = slot * set.chips.length + j;
          if (k === undefined || j >= Math.round(set.chips.length * state[k].leaves)) { set.mesh.setMatrixAt(idx, zero); return; }
          const t = trees[k];
          const p = new THREE.Vector3(...ch.p).applyMatrix4(place(t));
          q.setFromEuler(new THREE.Euler(-ch.tilt, ch.yaw + hash01(t.seed, 4) * 6.3, 0, 'YXZ'));
          set.mesh.setMatrixAt(idx, m.compose(p, q, s.set(ch.s, ch.s, ch.s)));
          set.mesh.setColorAt(idx, tint.copy(state[k].c).multiplyScalar(0.95 + 0.15 * ch.depth));
        });
      }
      set.mesh.instanceMatrix.needsUpdate = true;
      if (set.mesh.instanceColor) set.mesh.instanceColor.needsUpdate = true;
    }
  }

  let clock = 0;
  const camPos = new THREE.Vector3();
  const lastTipCam = new THREE.Vector3(Infinity, 0, 0);
  /** Per frame: falling leaves, and B's near/far swap by camera distance to each group. */
  function update(dt: number, camera?: THREE.Camera) {
    clock += dt;
    let any = false;
    trees.forEach((t, i) => {
      const n = state[i].falling;
      for (let j = 0; j < FALL; j++) {
        const idx = i * FALL + j, [a, b, c, d] = fallSeeds[idx];
        if (j >= Math.round(FALL * n)) { falling.setMatrixAt(idx, zero); continue; }
        any = true;
        const H = t.dims.heightM, R = t.dims.spreadM / 2;
        const period = 6 + 5 * a;
        const ph = ((clock / period) + b) % 1;
        const y = t.y + H * (0.75 - 0.75 * ph);
        const ang = c * 6.3 + clock * 0.3, rad = R * (0.3 + 0.8 * d) + Math.sin(clock * 2 + j) * 0.4;
        q.setFromEuler(new THREE.Euler(clock * (1 + a), clock * 2 * (b - 0.5), 0));
        const size = 0.12 + 0.05 * c;
        falling.setMatrixAt(idx, m.compose(v.set(t.x + Math.cos(ang) * rad, y, t.z + Math.sin(ang) * rad), q, s.set(size, size, size)));
        falling.setColorAt(idx, state[i].c);
      }
    });
    falling.visible = any;
    if (any) { falling.instanceMatrix.needsUpdate = true; if (falling.instanceColor) falling.instanceColor.needsUpdate = true; }
    if (tips && camera) {
      camera.getWorldPosition(camPos);
      if (camPos.distanceTo(lastTipCam) > 1) {
        lastTipCam.copy(camPos);
        tipped = trees.map((t, k) => ({ k, d: camPos.distanceTo(v.set(t.x, t.y + t.dims.heightM * 0.6, t.z)) }))
          .filter(e => e.d < TIP_RANGE_M).sort((a, b) => a.d - b.d).slice(0, TIP_CAP).map(e => e.k);
        writeTips();
      }
    }
    if (fansNear && camera) {
      camera.getWorldPosition(camPos);
      const c = trees.reduce((acc, t) => acc.add(v.set(t.x, t.y, t.z)), new THREE.Vector3()).divideScalar(trees.length);
      const near = camPos.distanceTo(c) < nearM;
      for (let k = 0; k < nearSwap.length; k += 2) { nearSwap[k].visible = near; nearSwap[k + 1].visible = !near; }
    }
  }
  setSeason(180);

  return {
    group,
    draws: () => meshes.filter(m => m.visible).length,
    triangles: () => meshes.filter(m => m.visible).reduce((n, mesh) => n + tris(mesh.geometry) * mesh.count, 0),
    /** Triangles actually drawn: visible meshes, instances that aren't scaled to nothing. */
    drawnTriangles() {
      const mm = new THREE.Matrix4();
      return meshes.filter(m => m.visible).reduce((n, mesh) => {
        let live = 0;
        for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, mm); if (mm.determinant() !== 0) live++; }
        return n + tris(mesh.geometry) * live;
      }, 0);
    },
    /** Trees carrying C4 fan tips right now. */
    tipped: () => tipped.length,
    setSeason,
    update,
    setNight(n: number) { for (const mat of [foliageMat, chipMat]) mat.emissiveIntensity = 0.25 * (1 - n); },
    dispose() {
      group.removeFromParent();
      for (const mesh of meshes) { mesh.geometry.dispose(); mesh.dispose(); }
      for (const mat of [bark, foliageMat, chipMat, carpetMat]) mat.dispose();
    },
  };
}

export type { Dims };
