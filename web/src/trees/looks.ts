/**
 * Lab rendering options for the species after the ginkgo (docs/tree-species.md#species-options).
 * A species "look" pairs the framework Species (sizes, season) with a habit and a list of
 * options, each one technique with its own counts per tier:
 *
 *   cards   crossed alpha-tested cards painted with the species' leaves (4 triangles each)
 *   cored   a small faceted core in each branch mass, under leaf cards: fuller, more solid
 *   lobes   faceted leaf clusters, every facet inked: the house clump style
 *
 * Foliage is organised by the branches, not poured into the crown's outline: each scaffold limb
 * ends in a rounded mass (broadleaf.ts crownMasses), split into small leaf clusters lit on top
 * and shaded beneath. That organisation is what makes a species recognisable (Sam's ginkgo
 * review); colour and outline alone make every tree generic.
 *
 * Every option draws limbs and foliage per size class present, plus a leaf carpet: 2 draws per
 * class and 1 more, however many trees. Seasonal colour is two tones per tree, mixed per leaf
 * mass, and leaf drop thins the crown mass by mass (both in the vertex shader).
 *
 * Lab only: City draws none of these until Sam picks one per species.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { inkFoliageMesh, type InkFoliageMode } from '../vignette/ink';
import { broadleafForm, crownMasses, envelope, envelopeNormal, habitFor, ringAt, massClusters, type Habit, type Unit } from './broadleaf';
import { FoliageBuilder, TIP_CAP, TIP_RANGE_M, blooms, crownNormals, foliageDepth, leafAtlas, leafTips, lobes, needleStars, twoToneFoliage, unitCards, type LeafShape } from './foliage-kit';
import { skeletonGeometry, treeDims, type TreePlacement } from './render';
import { doyOf, hash01, type Foliage, type SizeClass, type Species, type TreeQuality, type V3 } from './species';

export type Technique = 'cards' | 'cored' | 'lobes' | 'stars';
export type { LeafShape };

export interface LookOption {
  id: string;
  label: string;
  technique: Technique;
  /** Leaf clusters per tree, per tier: cards (cards, cored) or faceted lobes. */
  units: Record<TreeQuality, number>;
  /** Glossy leaves (cards only): the share of painted leaves that can flash in the sun. */
  specks?: number;
  /** Tufts: 0 round clusters, 1 flat pads facing up (a pine's needle tufts). */
  flat?: number;
  /** Vertical scale of each crossed card, for flat horizontal tiers. */
  cardHeight?: number;
  /** Lobes only: vertical squash (pads). */
  squash?: number;
  /** Cluster size as a fraction of its branch mass: higher closes each mass. */
  cover?: number;
  /** Lobes only: sides around each mass, 3 (6 triangles, finer) or 4 (8 triangles, rounder). */
  facets?: 3 | 4;
  /** Foliage ink (vignette/ink.ts): 1–3 outline only the crown's silhouette; none outlines every facet. */
  ink?: InkFoliageMode;
  /** Near leaf tips per outer leaf mass (the ginkgo C4 technique), high detail only, within TIP_CAP and TIP_RANGE_M. */
  tips?: number;
  /** Flower chips per tree, per tier, spread over the outer clusters (species that bloom). */
  blooms?: Record<TreeQuality, number>;
  /** One line for Sam: what it is for. */
  note: string;
}

/** A day's colouring: tone A and tone B, mixed per leaf mass; leaves is the share still on. */
export interface Palette { leaves: number; a: THREE.Color; b: THREE.Color; carpet: number; carpetColour: THREE.Color; label: string; /** Share of flower chips open, 0–1. */ bloom: number }

export interface Look {
  species: Species;
  habit: Habit;
  leaf: LeafShape;
  /** Leaf paint: base lightness range for the atlas (cards multiply the season colour). */
  options: LookOption[];
  palette(doy: number, offset: number): Palette;
  /** Cultivar colourways (a Japanese maple's scarlet, Bloodgood burgundy, orange-red): each tree
   *  takes one by its seed; repeat an entry to weight it. `palette` stays the species default. */
  varieties?: Look['palette'][];
  /** Extra lightness for card options at low detail, measured to match the generic canopy. */
  lowLift?: number;
  /** Tone B is the sunlit colour: each cluster's tone follows how far it faces up (a pine's
   *  yellow-green tops over a deeper green underside), not chance. */
  toneByLight?: boolean;
  /** Flower or bract colour, and chip size in metres, for species that bloom (palette.bloom). */
  bloomColour?: string;
  /** Several bloom colours (crape myrtle): each tree takes one by its seed. */
  bloomColours?: string[];
  bloomSizeM?: number;
  /** Distance from cluster centre in cluster radii. */
  bloomOffset?: number;
  /** While in flower, up to this share of the leaf clusters turn wholly to the bloom colour
   *  (a crape myrtle's crown covered in trusses), at no triangle cost. */
  bloomWash?: number;
  /** How far blossom escapes the crown's interior shade, 0–1 (0: shaded like the leaves). */
  bloomLift?: number;
}

// ---- calendar ------------------------------------------------------------------------------

/** One dated stage: the crown on that day; days between two keys are interpolated. */
export interface Key { m: number; d: number; leaves: number; a: string; b: string; carpet?: number; bloom?: number; label: string }

/**
 * A year from dated keys, wrapping at New Year. Each species lists its keys with the source for
 * each date in docs/tree-species.md.
 */
export function keyedCalendar(keys: Key[]) {
  const ks = keys.map(k => ({ ...k, doy: doyOf(k.m, k.d), ca: new THREE.Color(k.a), cb: new THREE.Color(k.b) })).sort((p, q) => p.doy - q.doy);
  return (doy: number, offset: number): Palette => {
    const d = ((doy + offset) % 365 + 365) % 365;
    let i = ks.findIndex(k => k.doy > d);
    if (i < 0) i = 0;
    const next = ks[i], prev = ks[(i - 1 + ks.length) % ks.length];
    const span = (next.doy - prev.doy + 365) % 365 || 365;
    const t = ((d - prev.doy + 365) % 365) / span;
    const carpetOf = (k: typeof prev) => k.carpet ?? 0;
    const carpet = carpetOf(prev) + (carpetOf(next) - carpetOf(prev)) * t;
    return {
      leaves: prev.leaves + (next.leaves - prev.leaves) * t,
      a: prev.ca.clone().lerp(next.ca, t),
      b: prev.cb.clone().lerp(next.cb, t),
      carpet,
      bloom: (prev.bloom ?? 0) + ((next.bloom ?? 0) - (prev.bloom ?? 0)) * t,
      carpetColour: new THREE.Color('#9c8460').lerp(new THREE.Color('#b0804a'), Math.min(1, carpet)),
      label: t < 0.5 ? prev.label : next.label,
    };
  };
}

/** The framework's Foliage from a palette, for the clump model ("Current" in the lab). */
export const foliageOf = (p: Palette): Foliage => ({
  leaves: p.leaves, colour: p.a.clone().lerp(p.b, 0.35), carpet: p.carpet, carpetColour: p.carpetColour, label: p.label,
});
/** The framework's Foliage with a species' bloom colour, for the clump model. */
const foliageWithBloom = (p: Palette, colour?: string): Foliage => ({ ...foliageOf(p), ...(colour && p.bloom > 0 ? { bloom: { colour: new THREE.Color(colour), share: p.bloom * 0.5 } } : {}) });

/** A broadleaf Species from a habit and a palette; the clump model reuses the look's skeleton. */
export function broadleafSpecies(s: Omit<Species, 'form' | 'foliage' | 'leaf'> & { habit: Habit; palette: Look['palette']; leaf?: Species['leaf']; bloomColour?: string }): Species {
  const { habit, palette, bloomColour, ...rest } = s;
  return {
    leaf: 'clump',
    ...rest,
    form: (size, q, d) => broadleafForm(habit, size, q, d, s.clumps[q], s.id.length),
    foliage: (doy, offset) => foliageWithBloom(palette(doy, offset), bloomColour),
  };
}

/** The crown envelope's outward normal at a point, metres: what crownNormals bends cards toward. */
const outwardOf = (e: ReturnType<typeof envelope>) => (p: THREE.Vector3) => envelopeNormal(e, p.x, p.y, p.z);

/**
 * Pull clusters in so each one's outer edge stays within the crown envelope plus a small
 * ragged margin: no tuft floats outside the species' outline.
 */
function inEnvelope(units: Unit[], e: ReturnType<typeof envelope>, margin = 1.06) {
  // Envelope metric: 1 on the outline. A cone top measures against its radius at each height,
  // continuous through the tip.
  const metric = (p: THREE.Vector3) => {
    const yN = (p.y - e.yc) / (p.y > e.yc ? e.above : e.below), horiz = Math.hypot(p.x, p.z) / e.R;
    if (yN > 0 && e.cone) return Math.max(yN, horiz / Math.max(0.05, ringAt(e, Math.min(yN, 0.99))));
    return Math.hypot(horiz, yN);
  };
  return units.map(u => {
    const n = new THREE.Vector3(...u.n);
    const at = (k: number) => new THREE.Vector3(u.c[0] * k, e.yc + (u.c[1] - e.yc) * k, u.c[2] * k);
    if (metric(at(1).addScaledVector(n, u.r)) <= margin) return u;
    if (!e.cone) {
      // The egg: the linear pull every approved species was tuned with.
      const centre = at(1), mC = metric(centre), rN = Math.max(0, metric(at(1).addScaledVector(n, u.r)) - mC);
      const c = at(Math.max(0, margin - rN) / Math.max(1e-6, mC));
      return { ...u, c: [c.x, c.y, c.z] as V3 };
    }
    // A cone: pull the centre toward the crown's core until its edge (centre + n·r) sits within
    // the margin, by bisection, as the cone's metric is not linear in the pull.
    let lo = 0, hi = 1;
    for (let i = 0; i < 14; i++) {
      const k = (lo + hi) / 2;
      if (metric(at(k).addScaledVector(n, u.r)) <= margin) lo = k; else hi = k;
    }
    const c = at(lo);
    return { ...u, c: [c.x, c.y, c.z] as V3 };
  });
}

/** An option's leaf clusters, metres: shared by the foliage and its near leaf tips. */
function lookClusters(look: Look, opt: LookOption, size: SizeClass, q: TreeQuality, n: number, seed: number) {
  const d = look.species.sizes[size];
  const h = habitFor(look.habit, size);
  const masses = crownMasses(look.habit, size, q, d, look.species.id.length);
  return inEnvelope(massClusters(masses, n, seed, opt.cover ?? 0.62, opt.flat ?? 0, h.clusterWeight), envelope(h, d))
    // Light-led tone stays below 1, so the bloom wash only takes the sunniest clusters as the
    // bloom grows, never all of them at its first flower.
    .map(u => look.toneByLight ? { ...u, tone: Math.min(0.97, Math.max(0, (u.depth - 0.45) / 0.5)) } : u);
}

/** Foliage for one option and size class, in unit space (crown radius 1, height 1). */
export function lookFoliage(look: Look, opt: LookOption, size: SizeClass, q: TreeQuality) {
  const d = look.species.sizes[size];
  const e = envelope(habitFor(look.habit, size), d);
  const seed = look.species.id.length * 1000 + size.length * 10 + (q === 'high' ? 1 : 2);
  const masses = crownMasses(look.habit, size, q, d, look.species.id.length);
  const clusters = lookClusters(look, opt, size, q, opt.units[q], seed);
  const b = new FoliageBuilder();
  if (opt.blooms && (look.bloomColour || look.bloomColours)) blooms(b, clusters, opt.blooms[q], seed + 9, look.bloomSizeM, look.bloomOffset);
  if (opt.technique === 'lobes') lobes(b, clusters, seed, opt.facets, opt.squash);
  else if (opt.technique === 'stars') needleStars(b, clusters, seed);
  else {
    unitCards(b, clusters, seed, 1.25, opt.cardHeight);
  }
  let g = b.geometry();
  if (opt.technique !== 'lobes' && opt.technique !== 'stars') crownNormals(g, outwardOf(e));
  if (opt.technique === 'cored') {
    // One dark faceted core per mass, cut once the crown is below about 60% in leaf. It keeps
    // its own facet normals: crown normals would light it like the surface.
    const cores = new FoliageBuilder();
    // Clamped like the cards, so no core shows outside the pulled-in silhouette.
    lobes(cores, inEnvelope(masses.map(m => ({ ...m, r: m.r * 0.48, depth: 0.05 })), e), seed + 3, 3);
    const both = mergeGeometries([g, cores.geometry()])!;
    g.dispose();
    g = both;
  }
  return g.scale(1 / e.R, 1 / e.H, 1 / e.R);
}

/** Near leaf tips for one option and size class, in unit space; null when the option has none. */
export function lookTips(look: Look, opt: LookOption, size: SizeClass, q: TreeQuality) {
  if (!opt.tips || q === 'low') return null;
  const d = look.species.sizes[size];
  const e = envelope(habitFor(look.habit, size), d);
  const seed = look.species.id.length * 1000 + size.length * 10 + 1;
  const b = new FoliageBuilder();
  leafTips(b, lookClusters(look, opt, size, q, opt.units.high, seed), look.leaf, opt.tips, seed + 5);
  return crownNormals(b.geometry(), outwardOf(e)).scale(1 / e.R, 1 / e.H, 1 / e.R);
}

const tris = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.attributes.position.count) / 3;
const CARPET_SIDES = 7;

/** Triangles per tree for an option, by part. */
export function lookTriangles(look: Look, opt: LookOption, size: SizeClass, q: TreeQuality) {
  const sk = skeletonGeometry(look.species, size, q), fo = lookFoliage(look, opt, size, q);
  const tp = lookTips(look, opt, size, q);
  // `total` is what every tree costs; `tips` is extra on the TIP_CAP nearest trees only.
  const out = { skeleton: tris(sk), foliage: tris(fo), carpet: look.species.carpet ? CARPET_SIDES : 0, tips: tp ? tris(tp) : 0, total: 0 };
  out.total = out.skeleton + out.foliage + out.carpet;
  sk.dispose(); fo.dispose(); tp?.dispose();
  return out;
}

// ---- renderer ------------------------------------------------------------------------------

/** Trees of one species drawn with one option; same interface as the ginkgo variants. */
export function createLook(placements: TreePlacement[], look: Look, optionId: string, quality: TreeQuality,
  groundAt: (x: number, z: number) => number | null, { carpet: withCarpet = true }: { carpet?: boolean } = {}) {
  const opt = look.options.find(o => o.id === optionId) ?? look.options[0];
  const trees = placements.flatMap(p => {
    const y = groundAt(p.x, p.z);
    return y === null ? [] : [{ ...p, y, dims: treeDims(p) }];
  });
  if (!trees.length) return null;
  const group = new THREE.Group();
  group.name = `${look.species.id} ${opt.id}`;
  const meshes: THREE.InstancedMesh[] = [];
  const bark = new THREE.MeshLambertMaterial({ vertexColors: true });
  const textured = opt.technique === 'cards' || opt.technique === 'cored';
  // Needle stars are open single triangles: both faces must draw.
  const leafMat = !textured
    ? twoToneFoliage({ flatShading: true, bloomWash: look.bloomWash, bloomLift: look.bloomLift, side: opt.technique === 'stars' ? THREE.DoubleSide : THREE.FrontSide })
    : twoToneFoliage({ bloomWash: look.bloomWash, bloomLift: look.bloomLift, specks: opt.specks, map: leafAtlas(look.leaf), alphaTest: 0.5, side: THREE.DoubleSide });
  const tipMat = twoToneFoliage({ side: THREE.DoubleSide });
  const depthMat = foliageDepth(leafMat);
  // Foliage meshes registered with the ink's foliage mask: outlined at the crown's silhouette only.
  const unregister: (() => void)[] = [];
  const inked = (mesh: THREE.InstancedMesh) => { if (opt.ink) unregister.push(inkFoliageMesh(mesh, opt.ink)); return mesh; };
  const carpetMat = new THREE.MeshLambertMaterial({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const add = (g: THREE.BufferGeometry, mat: THREE.Material, n: number, name: string) => {
    const mesh = new THREE.InstancedMesh(g, mat, n);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
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
    return m.compose(v.set(t.x, t.y, t.z), q, s.set(r, t.dims.heightM, r));
  };
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const tipSets: { mesh: THREE.InstancedMesh; members: typeof trees; toneB: THREE.InstancedBufferAttribute; leaves: THREE.InstancedBufferAttribute; slots: number }[] = [];
  /** Trees (indices into `trees`) carrying leaf tips now: nearest first, within range, capped. */
  let tipped: number[] = [];
  let pal = new Map<(typeof trees)[number], Palette>();
  const limbMeshes: THREE.InstancedMesh[] = [];
  let far = false, anyBare = false;
  const foliageSets: { mesh: THREE.InstancedMesh; members: typeof trees; toneB: THREE.InstancedBufferAttribute; leaves: THREE.InstancedBufferAttribute; bloom: THREE.InstancedBufferAttribute }[] = [];
  const blooming = !!(look.bloomColour || look.bloomColours);
  // Each tree's bloom colour, fixed by its seed: worked out once, not on every season change.
  const bloomColours = new Map(trees.map(t => [t, new THREE.Color(look.bloomColours
    ? look.bloomColours[Math.floor(hash01(t.seed, 13) * look.bloomColours.length)] : look.bloomColour ?? '#ffffff')]));
  const bloomOf = (t: (typeof trees)[number]) => bloomColours.get(t)!;
  const paletteOf = (t: (typeof trees)[number]) => look.varieties
    ? look.varieties[Math.floor(hash01(t.seed, 14) * look.varieties.length)] : look.palette;
  for (const size of new Set(trees.map(t => t.size))) {
    const members = trees.filter(t => t.size === size);
    const limbs = add(skeletonGeometry(look.species, size, quality), bark, members.length, `${size} limbs`);
    limbMeshes.push(limbs);
    members.forEach((t, i) => limbs.setMatrixAt(i, place(t)));
    const g = lookFoliage(look, opt, size, quality);
    const toneB = new THREE.InstancedBufferAttribute(new Float32Array(members.length * 3), 3);
    const leaves = new THREE.InstancedBufferAttribute(new Float32Array(members.length), 1);
    g.setAttribute('aToneB', toneB);
    g.setAttribute('aLeaves', leaves);
    const bloom = new THREE.InstancedBufferAttribute(new Float32Array(members.length * 4), 4);
    g.setAttribute('aBloom', bloom);
    const mesh = inked(add(g, leafMat, members.length, `${size} foliage ${opt.id}`));
    // Shadows from the same leaves that are drawn: no shadows from dropped leaves or closed flowers.
    mesh.customDepthMaterial = depthMat;
    // Cards don't receive shadows: self-shadowing blotched the crown interior dark.
    if (textured) mesh.receiveShadow = false;
    members.forEach((t, i) => { mesh.setMatrixAt(i, place(t)); mesh.setColorAt(i, new THREE.Color(1, 1, 1)); });
    foliageSets.push({ mesh, members, toneB, leaves, bloom });
    const tg = lookTips(look, opt, size, quality);
    if (tg) {
      const slots = Math.min(TIP_CAP, members.length);
      const tB = new THREE.InstancedBufferAttribute(new Float32Array(slots * 3), 3), tL = new THREE.InstancedBufferAttribute(new Float32Array(slots), 1);
      tg.setAttribute('aToneB', tB);
      tg.setAttribute('aLeaves', tL);
      const tm = inked(add(tg, tipMat, slots, `${size} leaf tips`));
      tm.receiveShadow = false;
      for (let i = 0; i < slots; i++) { tm.setMatrixAt(i, zero); tm.setColorAt(i, new THREE.Color(1, 1, 1)); }
      tipSets.push({ mesh: tm, members, toneB: tB, leaves: tL, slots });
    }
  }
  // City can draw one leaf carpet across all species instead ({ carpet: false }).
  const carpet = look.species.carpet && withCarpet ? add(new THREE.CircleGeometry(1, CARPET_SIDES).rotateX(-Math.PI / 2), carpetMat, trees.length, 'carpet') : null;
  // Leaf litter is ground cover for the perf report (phone-perf's categories).
  if (carpet) carpet.userData.perf = 'landscape';
  if (carpet) carpet.castShadow = false;
  const tint = new THREE.Color();
  // Low detail has fewer, bigger cards; where more of the shaded interior shows, the look's
  // lowLift keeps its crowns as bright as the high tier's (measured with __lab.crownStats()).
  const lift = quality === 'low' && opt.technique !== 'lobes' && opt.technique !== 'stars' ? look.lowLift ?? 0 : 0;
  /** Season tones for one tree, with its own small shift in lightness and hue. */
  const tones = (t: (typeof trees)[number]) => {
    const p = pal.get(t)!;
    const j = (hash01(t.seed, 9) - 0.5) * 0.06 + lift, hj = (hash01(t.seed, 10) - 0.5) * 0.02;
    return { p, a: p.a.clone().offsetHSL(hj, 0, j), b: p.b.clone().offsetHSL(hj, 0, j) };
  };
  function writeTips() {
    for (const set of tipSets) {
      const mine = tipped.map(k => trees[k]).filter(t => set.members.includes(t)).slice(0, set.slots);
      for (let i = 0; i < set.slots; i++) {
        const t = mine[i];
        if (!t || pal.get(t)!.leaves <= 0.02) { set.mesh.setMatrixAt(i, zero); continue; }
        const { p, a, b } = tones(t);
        set.mesh.setMatrixAt(i, place(t));
        set.mesh.setColorAt(i, a);
        set.toneB.setXYZ(i, b.r, b.g, b.b);
        set.leaves.setX(i, p.leaves);
      }
      set.mesh.instanceMatrix.needsUpdate = true;
      if (set.mesh.instanceColor) set.mesh.instanceColor.needsUpdate = true;
      set.toneB.needsUpdate = set.leaves.needsUpdate = true;
    }
  }

  function setSeason(doy: number) {
    pal = new Map(trees.map(t => [t, paletteOf(t)(doy, (hash01(t.seed, 2) * 2 - 1) * look.species.offsetDays)]));
    anyBare = false;
    for (const set of foliageSets) set.members.forEach((t, i) => {
      // A small per-tree shift in lightness and hue: no two trees in a row match exactly.
      const { p, a, b } = tones(t);
      set.mesh.setColorAt(i, a);
      set.toneB.setXYZ(i, b.r, b.g, b.b);
      set.leaves.setX(i, p.leaves);
      const bc = bloomOf(t);
      set.bloom.setXYZW(i, bc.r, bc.g, bc.b, blooming ? p.bloom : 0);
      // Hidden only when bare and not in flower (dogwood bracts open before the leaves).
      const hidden = p.leaves <= 0.02 && !(blooming && p.bloom > 0.01);
      // A thin crown (leafing out or dropping) reads as a haze, not a tree: keep the limbs too.
      if (p.leaves < 0.5 && !(blooming && p.bloom > 0.3)) anyBare = true;
      set.mesh.setMatrixAt(i, hidden ? zero : place(t));
      set.toneB.needsUpdate = set.leaves.needsUpdate = set.bloom.needsUpdate = true;
    });
    if (carpet) trees.forEach((t, i) => {
      const p = pal.get(t)!;
      if (p.carpet <= 0.01) { carpet.setMatrixAt(i, zero); return; }
      const r = t.dims.spreadM / 2 * 1.1 * (0.6 + 0.4 * p.carpet);
      carpet.setMatrixAt(i, m.compose(v.set(t.x, t.y + 0.05, t.z), q.identity(), s.set(r, 1, r)));
      carpet.setColorAt(i, p.carpetColour);
    });
    for (const mesh of meshes) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
    writeTips();
    showLimbs();
  }
  // Far trees drop their limbs, except while any crown is bare or thin: a far tree in winter
  // would otherwise vanish.
  function showLimbs() { for (const mesh of limbMeshes) mesh.visible = !far || anyBare; }
  setSeason(doyOf(7, 1));
  const camPos = new THREE.Vector3(), lastCam = new THREE.Vector3(Infinity, 0, 0);
  return {
    group,
    option: opt,
    draws: () => meshes.filter(x => x.visible).length,
    triangles: () => meshes.filter(x => x.visible).reduce((n, mesh) => n + tris(mesh.geometry) * mesh.count, 0),
    setSeason,
    /** Leaf tips follow the camera: the TIP_CAP nearest trees within TIP_RANGE_M. */
    update(_dt: number, camera?: THREE.Camera) {
      if (!tipSets.length || !camera || far) return;
      camera.getWorldPosition(camPos);
      if (camPos.distanceTo(lastCam) < 1) return;
      lastCam.copy(camPos);
      tipped = trees.map((t, k) => ({ k, d: camPos.distanceTo(v.set(t.x, t.y + t.dims.heightM * 0.6, t.z)) }))
        .filter(x => x.d <= TIP_RANGE_M).sort((p, q2) => p.d - q2.d).slice(0, TIP_CAP).map(x => x.k);
      writeTips();
    },
    /** Trees carrying leaf tips right now. */
    tipped: () => tipped.length,
    setNight(_n: number) { /* lit only by the scene: foliage never glows */ },
    /**
     * City's detail switch (area.setDetail): far from the camera, drop the limbs, leaf tips and
     * leaf carpet, keeping only the crowns (phone-perf's farTrees gate, as for the generic trees).
     * Limbs stay while any crown is bare or thin. No caller yet: the tree-species rollout wires it in.
     */
    setDetail({ farTrees }: { farTrees?: boolean }) {
      far = !!farTrees;
      showLimbs();
      for (const set of tipSets) set.mesh.visible = !far;
      if (carpet) carpet.visible = !far;
    },
    dispose() {
      group.removeFromParent();
      unregister.forEach(u => u());
      for (const mesh of meshes) { mesh.geometry.dispose(); mesh.dispose(); }
      for (const mat of [bark, leafMat, tipMat, carpetMat, depthMat]) mat.dispose();
    },
  };
}

