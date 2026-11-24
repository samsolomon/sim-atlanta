/**
 * Species-independent foliage builders shared by every lab rendering option
 * (ginkgo-variants.ts, looks.ts). Two families:
 *
 *   sprays  foliage laid along limbs: branch sleeves, flame tufts, spray cards, fan chips
 *   masses  foliage packed into a crown envelope: faceted lobes, unit cards, a faceted core
 *
 * Plus the painted leaf atlases for cards, and a two-tone foliage material whose leaf masses
 * mix two seasonal colours and drop one by one. Each species keeps its own skeleton, sprays,
 * shading and calendar.
 */
import * as THREE from 'three';
import { Builder, rng } from '../vignette/geom';
import type { Unit } from './broadleaf';
import type { V3 } from './species';

export type LeafShape = 'narrow' | 'spatulate' | 'lobed' | 'palmate' | 'star' | 'tulip' | 'oval' | 'needles';
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


// ---- leaf atlas ----------------------------------------------------------------------------

const atlases = new Map<LeafShape, THREE.Texture>();
const WHITE = new THREE.Color(1, 1, 1);
/** Atlas cell size in pixels; leaf sizes below are for a 128 px cell. */
const CELL = 256;
/** Leaf size multiplier in cells 0, 1 and 2: coarse, medium, fine. */
const LEAF_SCALE = [1.5, 0.85, 0.45];
/** The solid cell's alpha: a faceted core is cut once the crown is below about 60% in leaf. */
const CORE_ALPHA = 0.72;
/** Cell (0–3) of the 2×2 atlas; cell 3 is solid, for faceted cores that share the cards' material. */
const SOLID = 3;
function leafPath(g: CanvasRenderingContext2D, shape: LeafShape, s: number) {
  g.beginPath();
  switch (shape) {
    case 'narrow': g.ellipse(0, s * 0.5, s * 0.13, s * 0.5, 0, 0, Math.PI * 2); break;
    case 'spatulate':
      g.moveTo(0, 0); g.lineTo(-s * 0.12, s * 0.45); g.quadraticCurveTo(-s * 0.36, s * 0.95, 0, s);
      g.quadraticCurveTo(s * 0.36, s * 0.95, s * 0.12, s * 0.45); g.closePath(); break;
    case 'oval': g.ellipse(0, s * 0.5, s * 0.3, s * 0.5, 0, 0, Math.PI * 2); break;
    case 'lobed':
      for (let k = 0; k < 4; k++) { const y = s * (0.25 + k * 0.2); g.ellipse(0, y, s * (0.32 - k * 0.04), s * 0.13, 0, 0, Math.PI * 2); }
      break;
    case 'palmate':
      for (const a of [-0.8, 0, 0.8]) { g.moveTo(0, 0); g.ellipse(Math.sin(a) * s * 0.35, Math.cos(a) * s * 0.4, s * 0.2, s * 0.32, -a, 0, Math.PI * 2); }
      break;
    case 'star':
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, rr = k % 2 ? s * 0.18 : s * 0.5; g.lineTo(Math.sin(a) * rr, s * 0.5 + Math.cos(a) * rr); }
      g.closePath(); break;
    case 'needles':
      // A fascicle burst: long thin needles radiating from the twig tip.
      // Wide enough (about 3 px a needle) that mipmaps keep them above the alpha test at range.
      for (let k = 0; k < 7; k++) { const a = -0.9 + k * 0.3; g.moveTo(-s * 0.05, 0); g.lineTo(Math.sin(a) * s * 1.3 - s * 0.09, Math.cos(a) * s * 1.3); g.lineTo(Math.sin(a) * s * 1.3 + s * 0.09, Math.cos(a) * s * 1.3); g.lineTo(s * 0.05, 0); g.closePath(); }
      break;
    case 'tulip':
      g.moveTo(0, 0); g.lineTo(-s * 0.45, s * 0.35); g.lineTo(-s * 0.4, s * 0.85); g.lineTo(-s * 0.12, s * 0.8);
      g.lineTo(0, s * 0.92); g.lineTo(s * 0.12, s * 0.8); g.lineTo(s * 0.4, s * 0.85); g.lineTo(s * 0.45, s * 0.35); g.closePath(); break;
  }
}
/** Leaf sizes in atlas pixels (a 128 px cell spans a card about 2–3 m across). */
const LEAF_PX: Record<LeafShape, [number, number]> = {
  needles: [9, 12],
  narrow: [9, 13], spatulate: [11, 15], oval: [12, 17], lobed: [13, 17], palmate: [12, 16], star: [13, 17], tulip: [13, 17],
};
/**
 * Grey leaves on a transparent ground, three cells of rounded sprays and one solid cell. The
 * material's vertex and instance colours tint them, so one atlas serves every season.
 */
export function leafAtlas(shape: LeafShape): THREE.Texture | null {
  const hit = atlases.get(shape);
  if (hit) return hit;
  // Tests run without a DOM; geometry and counts do not need the paint.
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 2 * CELL;
  const g = c.getContext('2d')!;
  const r = rng(shape.length * 977);
  const [lo, hi] = LEAF_PX[shape];
  const k = CELL / 128;
  for (let cell = 0; cell < 4; cell++) {
    const ox = (cell % 2) * CELL, oy = Math.floor(cell / 2) * CELL;
    if (cell === SOLID) { g.fillStyle = `rgba(196,196,196,${CORE_ALPHA})`; g.fillRect(ox + 2, oy + 2, CELL - 4, CELL - 4); continue; }
    // Cells 0–2 paint the same spray with coarse, medium and fine leaves (LEAF_SCALE).
    const ls = LEAF_SCALE[cell] * k;
    // A rounded spray: dense in the middle, ragged at the edge, twigs underneath.
    g.strokeStyle = 'rgba(105,95,72,0.97)'; g.lineWidth = 1.3 * k;
    for (let j = 0; j < 5; j++) {
      const a = r() * Math.PI * 2;
      g.beginPath(); g.moveTo(ox + 64 * k, oy + 70 * k); g.lineTo(ox + (64 + Math.cos(a) * 40) * k, oy + (70 + Math.sin(a) * 40) * k); g.stroke();
    }
    const count = Math.round(5200 / (lo * hi * 0.35) / LEAF_SCALE[cell] ** 2);
    for (let i = 0; i < count; i++) {
      const rad = 54 * Math.sqrt(r()) * (0.75 + 0.25 * Math.sin(i));
      const a = r() * Math.PI * 2;
      const x = ox + (64 + Math.cos(a) * rad) * k, y = oy + (64 + Math.sin(a) * rad) * k;
      const s = (lo + r() * (hi - lo)) * ls;
      g.save(); g.translate(x, y); g.rotate(r() * Math.PI * 2);
      const v = Math.round(175 + 80 * (0.4 + 0.6 * r()) * (1 - rad / 90));
      // Alpha is each leaf's drop order: the material cuts it against the tree's leaf share.
      g.fillStyle = `rgba(${v},${v},${v},${(0.56 + 0.44 * r()).toFixed(3)})`;
      leafPath(g, shape, s); g.fill();
      g.restore();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  atlases.set(shape, tex);
  return tex;
}
/**
 * Pick the atlas cell whose leaves come out about `leafM` long on a card `cardM` across, so
 * leaves look the same size on a sapling's small cards and a specimen's big ones.
 */
export function cellFor(cardM: number, leafM = 0.45) {
  const want = leafM / (cardM * 11 / 128);
  let best = 0;
  LEAF_SCALE.forEach((sc, i) => { if (Math.abs(Math.log(sc / want)) < Math.abs(Math.log(LEAF_SCALE[best] / want))) best = i; });
  return best;
}
const cellUV = (cell: number, u: number, v: number): [number, number] => [((cell % 2) + u) / 2, 1 - (Math.floor(cell / 2) + 1 - v) / 2];

// ---- foliage geometry ----------------------------------------------------------------------

/** Vertex shade: the rim and top bright, the core dark. Multiplies the season colour. */
export function shade(depth: number, up: number) {
  // Strong top-to-underside contrast, so each branch mass reads as its own rounded lump.
  const k = 0.5 + 0.56 * Math.min(1, Math.max(0, depth * 0.55 + up * 0.45));
  return new THREE.Color(k, k, k * 0.96);
}

/** Collects triangles with colour, UV and the per-mass tone and drop attributes. */
export class FoliageBuilder {
  pos: number[] = []; col: number[] = []; uv: number[] = []; mass: number[] = [];
  /** `bloom` > 0 marks a flower chip: its bloom order (0–1], shown while the tree's bloom share is at least that. */
  tri(p: THREE.Vector3[], c: THREE.Color, u: Unit, uvs: [number, number][] = [cellUV(SOLID, 0.5, 0.5), cellUV(SOLID, 0.5, 0.5), cellUV(SOLID, 0.5, 0.5)], bloom = 0) {
    p.forEach((v, i) => { this.pos.push(v.x, v.y, v.z); this.col.push(c.r, c.g, c.b); this.uv.push(...uvs[i]); this.mass.push(u.tone, u.drop, bloom); });
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aMass', new THREE.Float32BufferAttribute(this.mass, 3));
    g.computeVertexNormals();
    return g;
  }
}

/**
 * Light a crown like one solid blob: bend every vertex normal `blend` of the way toward
 * `outward(p)`, the crown's outward direction at that point (Sam: cards should keep the low-poly
 * canopy's brightness). `outward` takes points in the geometry's current space: call it before
 * scaling to unit space when the callback works in metres (as looks.ts does).
 * Materials must not use flatShading, which ignores vertex normals.
 */
export function crownNormals(g: THREE.BufferGeometry, outward: (p: THREE.Vector3) => THREE.Vector3, blend = 0.8) {
  if (!g.attributes.normal) g.computeVertexNormals();
  const pos = g.attributes.position, nor = g.attributes.normal;
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i).multiplyScalar(1 - blend).addScaledVector(outward(p).normalize(), blend).normalize();
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  nor.needsUpdate = true;
  return g;
}

/** A jittered bipyramid per mass, tumbled: 6 or 8 flat facets. */
export function lobes(b: FoliageBuilder, units: Unit[], seed: number, sides: 3 | 4 = 4, squash = 1) {
  const r = rng(seed);
  for (const u of units) {
    const c = new THREE.Vector3(...u.c);
    // A random tumble, so neighbouring masses never stack into tiers of matching pyramids.
    const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.6, r() * Math.PI, (r() - 0.5) * 0.6));
    const j = () => 0.8 + r() * 0.4;
    const pt = (x: number, y: number, z: number) => c.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(rot));
    const top = pt(0, u.r * 0.62 * squash * j(), 0);
    const bot = pt(0, -u.r * 0.5 * squash * j(), 0);
    const ring = Array.from({ length: sides }, (_, i) => i / sides * Math.PI * 2).map(a => pt(Math.cos(a) * u.r * j(), (r() - 0.5) * u.r * 0.3, Math.sin(a) * u.r * j()));
    for (let i = 0; i < sides; i++) {
      const p = ring[i], q = ring[(i + 1) % sides];
      b.tri([top, q, p], shade(u.depth, 0.9), u);
      b.tri([bot, p, q], shade(u.depth * 0.6, -0.5), u);
    }
  }
}

/**
 * Needle stars: each tuft is `rays` thin triangles fanning out from its centre, mostly sideways
 * and up, like a loblolly's fascicles at a bare twig tip. Flat shaded, tips lighter.
 */
export function needleStars(b: FoliageBuilder, units: Unit[], seed: number, rays = 6) {
  const r = rng(seed);
  for (const u of units) {
    const c = new THREE.Vector3(...u.c);
    const n = new THREE.Vector3(...u.n);
    for (let k = 0; k < rays; k++) {
      const a = (k / rays) * Math.PI * 2 + r() * 0.5;
      const dir = new THREE.Vector3(Math.cos(a), 0.25 + r() * 0.5, Math.sin(a)).normalize().addScaledVector(n, 0.35).normalize();
      const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
      const w = u.r * 0.28;
      const base = c.clone().addScaledVector(dir, -u.r * 0.15);
      const tip = c.clone().addScaledVector(dir, u.r * (0.95 + r() * 0.25));
      const col = shade(u.depth, dir.y);
      b.tri([base.clone().addScaledVector(side, -w), base.clone().addScaledVector(side, w), tip], col, u);
    }
  }
}

/** Two crossed cards per mass: one tangent to the crown (its silhouette), one radial (its depth). */
export function unitCards(b: FoliageBuilder, units: Unit[], seed: number, scale = 1.25, height = 1) {
  const r = rng(seed);
  for (const u of units) {
    const c = new THREE.Vector3(...u.c);
    const n = new THREE.Vector3(...u.n);
    const t1 = new THREE.Vector3(0, 1, 0).cross(n);
    if (t1.lengthSq() < 1e-4) t1.set(1, 0, 0);
    t1.normalize().applyAxisAngle(n, (r() - 0.5) * 1.2);
    const t2 = new THREE.Vector3().crossVectors(n, t1).normalize();
    const w = u.r * scale;
    const cell = cellFor(w * 2);
    for (const [ax, ay] of [[t1, t2], [t1, n]] as const) {
      const p = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => c.clone().addScaledVector(ax, x * w).addScaledVector(ay, y * w));
      for (const v of p) v.y = c.y + (v.y - c.y) * height;
      const uv = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => cellUV(cell, x, y));
      // Softer than the facets' shade: the crown normals already light the crown as a blob.
      const col = shade(u.depth, n.y).lerp(WHITE, 0.55);
      b.tri([p[0], p[1], p[2]], col, u, [uv[0], uv[1], uv[2]]);
      b.tri([p[0], p[2], p[3]], col, u, [uv[0], uv[2], uv[3]]);
    }
  }
}

// ---- material ------------------------------------------------------------------------------

/**
 * Lambert foliage with two tones per tree: instance colour is tone A, `aToneB` tone B, and each
 * leaf mass mixes them by its own `aMass.x`. A mass whose drop order `aMass.y` is above the
 * tree's leaf share `aLeaves` collapses to nothing. Flower chips (`aMass.z` > 0, their bloom
 * order) ignore the leaves: they show in the instance's bloom colour `aBloom.rgb` while its
 * bloom share `aBloom.a` is at least their order.
 */
export function twoToneFoliage({ bloomWash = 0, bloomLift = 0, bloomFill = 0, specks = 0, ...opts }: THREE.MeshLambertMaterialParameters & { bloomWash?: number; bloomLift?: number; bloomFill?: number; specks?: number }) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, ...opts });
  const textured = !!opts.map;
  // Which leaves exist: shared with the ink's foliage mask (userData.maskShader), so the mask
  // traces only the leaves actually drawn.
  const visibility = (sh: { vertexShader: string; fragmentShader: string }) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aMass;\nattribute float aLeaves;\nattribute vec4 aBloom;\nvarying float vLeaves;\nvarying float vChip;\nvarying vec3 vFacePos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFacePos = mvPosition.xyz;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vLeaves = aLeaves;
vChip = aMass.z > 0.0 ? 1.0 : 0.0;
if (aMass.z > 0.0) { if (aMass.z > aBloom.a) transformed = vec3(0.0); }
${textured ? '' : 'else if (aMass.y > aLeaves) transformed = vec3(0.0);'}`);
    // Textured cards thin leaf by leaf: each painted leaf's alpha (0.56–1) is its drop order.
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vLeaves;\nvarying float vChip;\nvarying vec3 vFacePos;')
      .replace('#include <alphatest_fragment>', textured
        // Leaves thin by drop order and vanish on a bare tree (flowers stay); a card seen
        // edge-on is a streak, so it fades out at grazing angles (true face normal). The ink
        // mask runs this same patch, so it outlines exactly what is drawn. Derivatives come
        // first: they are undefined after a discard.
        // The fade lowers alpha before the alpha test and the drop-order cut, as it always has
        // (it also clears dark, steeply angled cards from the crown's interior).
        ? `float facing = abs(dot(normalize(cross(dFdx(vFacePos), dFdy(vFacePos))), normalize(vFacePos)));
if (vChip < 0.5) diffuseColor.a *= smoothstep(0.12, 0.35, facing);
#include <alphatest_fragment>
if (vChip < 0.5 && (vLeaves < 0.02 || diffuseColor.a < 1.0 - 0.44 * vLeaves - 0.005)) discard;`
        : '#include <alphatest_fragment>');
  };
  m.onBeforeCompile = (sh) => {
    visibility(sh);
    if (textured) {
      // The atlas sets only which leaves exist (alpha) and a light per-leaf variation; the
      // season tint sets the colour, so mipmapped edge texels can't darken the crown.
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
  vec4 texel = texture2D(map, vMapUv);
  diffuseColor.a *= texel.a;
  diffuseColor.rgb *= mix(1.0, texel.r, 0.25);
#endif`);
    }
    if (specks > 0 && textured) {
      // Glossy leaves (magnolia): small sharp highlights, not lit cards. A card is far bigger
      // than a leaf, so the gloss picks single painted leaves: a hash of each leaf's atlas
      // value (its grey and drop order) and a half-metre cell of tree space, so every card
      // picks its own few. A picked leaf flashes where its card's true face meets the sun's
      // half vector, only on the crown's sun side, and is gone at night.
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSpeckPos;')
        .replace('#include <project_vertex>', `#include <project_vertex>
#ifdef USE_INSTANCING
// Tree space plus a small per-tree offset (not the world position: sin() loses precision
// on large values far from the origin).
vSpeckPos = mat3(instanceMatrix) * transformed + mod(instanceMatrix[3].xyz, 97.0);
#else
vSpeckPos = transformed;
#endif`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSpeckPos;')
        .replace('#include <tonemapping_fragment>', `#if NUM_DIR_LIGHTS > 0
  {
    vec3 fN = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
    // vViewPosition points from the surface to the camera (three's geometryViewDir).
    vec3 V = normalize(vViewPosition);
    if (dot(fN, V) < 0.0) fN = -fN;
    vec3 L = directionalLights[0].direction;
    // Cards face every way, so a broad lobe: the leaves on cards turned toward the mirror angle.
    float s = smoothstep(0.45, 0.85, dot(fN, normalize(L + V)));
    // The crown's sun side (the smoothed crown normal), so specks gather upper and outer.
    float side = smoothstep(0.15, 0.6, dot(normalize(vNormal), L));
    // Kept small so sin() stays precise on mediump-leaning GPUs.
    vec3 cell = mod(floor(vSpeckPos * 2.0), 64.0);
    // The leaf's value from the full-size atlas: mip-averaged texels would blend neighbouring
    // leaves into new ids and crawl as the camera moves.
    vec4 leaf = textureLod(map, vMapUv, 0.0);
    float id = fract(sin(dot(vec4(floor(leaf.r * 24.0), floor(leaf.a * 48.0), cell.x + cell.z * 7.0, cell.y), vec4(12.9898, 78.233, 37.719, 4.581))) * 43758.5453);
    float pick = step(1.0 - ${specks.toFixed(3)}, id);
    // Off at night: the lab's night sun is ~0.15 of day, City's lower still.
    float sun = smoothstep(0.35, 1.2, dot(directionalLights[0].color, vec3(0.3333)));
    // Warm white over the dark green, like sun off wax.
    // Near-binary, so a speck is a sharp point of light, not a pale wash.
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.985, 0.94), pick * smoothstep(0.3, 0.55, s * side) * 0.95 * sun);
  }
#endif
#include <tonemapping_fragment>`);
    }
    // Double-sided cards keep one normal on both faces (three.js flips it on back faces,
    // which would darken half of every card).
    if (!opts.flatShading) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize(vNormal);');
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aToneB;')
      .replace('#include <color_vertex>', `#include <color_vertex>
#ifdef USE_INSTANCING_COLOR
  // Flower chips take the bloom colour; in flower, the leaf clusters with the highest tone turn
  // wholly to it too (bloomWash), as patches of blossom rather than a brown mix.
  bool blossom = aMass.z > 0.0 || aMass.x > 1.0 - ${bloomWash.toFixed(3)} * aBloom.a;
  // bloomLift: blossom keeps less of the interior shade than leaves (white bracts read white).
  vColor.xyz = blossom ? mix(color.xyz, vec3(1.0), ${bloomLift.toFixed(3)}) * aBloom.rgb : color.xyz * mix(instanceColor.xyz, aToneB, aMass.x);
#endif`);
    if (bloomFill > 0) {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vBlossom;')
        .replace('vColor.xyz = blossom ?', 'vBlossom = blossom ? 1.0 : 0.0;\n  vColor.xyz = blossom ?');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vBlossom;')
        .replace('#include <tonemapping_fragment>', `
#if NUM_DIR_LIGHTS > 0
  float bractDay = smoothstep(0.35, 1.2, dot(directionalLights[0].color, vec3(0.3333)));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, max(gl_FragColor.rgb, diffuseColor.rgb), vBlossom * bractDay * ${bloomFill.toFixed(3)});
#endif
#include <tonemapping_fragment>`);
    }
  };
  m.customProgramCacheKey = () => 'species-look-foliage' + (textured ? ':map' : '') + ':' + bloomWash + ':' + bloomLift + ':' + bloomFill + (textured && specks > 0 ? ':' + specks : '');
  m.userData.maskShader = visibility;
  m.userData.maskKey = 'species-look' + (textured ? ':map' : '');
  return m;
}

/**
 * Flowers or bracts: `total` small two-triangle chips spread over the outer, upper sides of
 * the leaf clusters, `size` metres across. Each takes a bloom order, so a tree's bloom share
 * opens them a few at a time, whatever the leaves are doing (dogwood bracts before leaves).
 */
export function blooms(b: FoliageBuilder, units: Unit[], total: number, seed: number, size = 0.5) {
  const r = rng(seed);
  const outer = units.filter(u => u.depth >= 0.45);
  const pool = outer.length ? outer : units;
  for (let k = 0; k < total; k++) {
    const u = pool[k % pool.length];
    const n = new THREE.Vector3(...u.n);
    {
      const dir = new THREE.Vector3(r() - 0.5, r() * 0.6, r() - 0.5).normalize().addScaledVector(n, 1.3).normalize();
      // On the cluster's surface, just proud of its cards, so flowers read over the leaves.
      const c = new THREE.Vector3(...u.c).addScaledVector(dir, u.r * (1.25 + r() * 0.15));
      // Face outward and a little up, not skyward: seen from the street a flower is never
      // edge-on (edge-on cards fade out).
      const face = new THREE.Vector3(dir.x, 0.35, dir.z);
      if (face.lengthSq() < 0.2) face.set(Math.cos(k * 2.4), 0.35, Math.sin(k * 2.4));
      face.normalize();
      const t1 = new THREE.Vector3(0, 1, 0).cross(face).normalize().applyAxisAngle(face, r() * Math.PI);
      const t2 = new THREE.Vector3().crossVectors(face, t1).normalize();
      const s = size * (0.8 + r() * 0.4) / 2;
      const p = [c.clone().addScaledVector(t1, s), c.clone().addScaledVector(t2, s), c.clone().addScaledVector(t1, -s), c.clone().addScaledVector(t2, -s)];
      const order = 0.05 + 0.95 * r();
      // Painted with the atlas's coarse leaf cell, so a truss reads as florets, not a square.
      const uv = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => cellUV(0, x, y));
      b.tri([p[0], p[1], p[2]], WHITE, u, [uv[0], uv[1], uv[2]], order);
      b.tri([p[0], p[2], p[3]], WHITE, u, [uv[0], uv[2], uv[3]], order);
    }
  }
}

/**
 * A shadow-pass material for a twoToneFoliage material: the same map, alpha test and
 * visibility patch, so shadows fall only from leaves and flowers that are drawn.
 */
export function foliageDepth(src: THREE.MeshLambertMaterial) {
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: src.map, alphaTest: src.alphaTest, side: src.side });
  const patch = src.userData.maskShader as ((sh: THREE.WebGLProgramParametersWithUniforms) => void) | undefined;
  if (patch) d.onBeforeCompile = sh => patch(sh);
  d.customProgramCacheKey = () => 'foliage-depth:' + (src.userData.maskKey ?? '');
  return d;
}

/** Leaf length and width in metres for near leaf tips, by leaf shape. */
const TIP_LEAF: Record<LeafShape, [number, number]> = {
  needles: [0.5, 0.05],
  narrow: [0.42, 0.09], spatulate: [0.36, 0.16], oval: [0.4, 0.2], lobed: [0.42, 0.24], palmate: [0.38, 0.3], star: [0.38, 0.3], tulip: [0.4, 0.3],
};
/**
 * Near-range leaf tips: small two-triangle leaves on the outer leaf masses, so a crown seen
 * close up shows leaves at its edge. Each tip takes its mass's tone and drop order.
 */
export function leafTips(b: FoliageBuilder, units: Unit[], shape: LeafShape, perUnit: number, seed: number) {
  const r = rng(seed);
  const [len, wid] = TIP_LEAF[shape];
  for (const u of units) {
    if (u.depth < 0.6) continue;
    const n = new THREE.Vector3(...u.n);
    for (let k = 0; k < perUnit; k++) {
      // On the mass's outward half, just proud of the cards.
      const dir = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().addScaledVector(n, 1.2).normalize();
      // Within the cluster's card extent: no leaf floats outside the crown's silhouette.
      const c = new THREE.Vector3(...u.c).addScaledVector(dir, u.r * (0.75 + r() * 0.2));
      const along = new THREE.Vector3(r() - 0.5, r() - 0.2, r() - 0.5).normalize();
      const across = new THREE.Vector3().crossVectors(along, dir).normalize();
      const s = 0.8 + r() * 0.5;
      const base = c.clone().addScaledVector(along, -len * s / 2), tip = c.clone().addScaledVector(along, len * s / 2);
      const l = c.clone().addScaledVector(across, wid * s), rr = c.clone().addScaledVector(across, -wid * s);
      const col = shade(0.9, dir.y).multiplyScalar(0.95 + r() * 0.15);
      b.tri([base, l, tip], col, u);
      b.tri([base, tip, rr], col, u);
    }
  }
}
