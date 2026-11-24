/**
 * The tree rollout in one City board row: plans the row (trees/rollout.ts), hands the generic
 * World its adjusted crown list and hooks, and draws the rolled-out species with tree-lab's looks
 * (option A). Everything it places is `illustrative` (no on-screen label; Key and About carry it).
 *
 * Budget (phone-perf, docs/perf.md): one size class per look at low detail (a specimen draws as
 * the mature form, scaled to its size); real bounding spheres so off-screen rows and the shadow
 * pass cull; under farTrees only foliage draws (no limbs, leaf tips or carpet).
 */
import * as THREE from 'three';
import { inkFoliageMesh, type InkFoliageMode } from '../vignette/ink';
import { pointInRing, segDist, type P2 } from '../vignette/geom';
import type { VBuilding, VGround, VRoad, World } from '../vignette/world';
import { createLook, type Look } from './looks';
import { hash01 } from './species';
import { treeDims } from './render';
import { americanElmLook, floweringDogwoodLook } from './elm-dogwood';
import { willowOakLook, waterOakLook } from './oaks';
import { whiteOakLook } from './white-oak';
import { southernMagnoliaLook, crapeMyrtleLook } from './magnolia-crape';
import { loblollyPineLook } from './pine-poplar';
import { sweetgumLook } from './maple-sweetgum';
import { japaneseMapleLook } from './japanese-maple';
import { crownKey, genericPlan, planRollout, positionSeed, tierPlan, type Crown, type RoundTwoRow, type RolloutSpecies } from './rollout';
import type { TreePlacement } from './render';
import type { TreeQuality } from './species';

export const ROLLOUT_LOOKS: Record<RolloutSpecies, Look> = {
  'american-elm': americanElmLook, 'flowering-dogwood': floweringDogwoodLook,
  'southern-magnolia': southernMagnoliaLook, 'white-oak': whiteOakLook,
  'willow-oak': willowOakLook, 'water-oak': waterOakLook,
  'crape-myrtle': crapeMyrtleLook,
  'loblolly-pine': loblollyPineLook,
  'sweetgum': sweetgumLook,
  'japanese-maple': japaneseMapleLook,
};

/** Diagnostic only: never change an ordinary visit, or the high tier. */
export function treeProbe(search: string, quality: TreeQuality) {
  const p = new URLSearchParams(search), perf = p.get('perf');
  if (quality !== 'low' || perf === null || perf === '0' || perf === 'off') return null;
  const probe = p.get('treeprobe');
  return ['mask-on', 'mask-off', 'shadow-off', 'foliage-off', 'carpet-off'].includes(probe ?? '') ? probe : null;
}

/**
 * `?trees=all-species`: an opt-in look at City with every canopy-row crown drawn as a wired
 * species (trees/rollout.ts allSpecies), for judging the fully converted look before more rollout.
 * Any other value, or none, is the ordinary view.
 */
export function allSpeciesPreview(search: string) {
  return treeMode(search) === 'all-species';
}

/**
 * Which trees City draws (Sam, 24 November: generic low-poly everywhere for now). `generic`, the
 * default, keeps every planned tree's position and size as a generic crown; `?trees=species`
 * draws today's species rollout; `?trees=all-species` the full-conversion preview.
 */
export type TreeMode = 'generic' | 'species' | 'all-species';
export function treeMode(search: string): TreeMode {
  const t = new URLSearchParams(search).get('trees');
  return t === 'species' || t === 'all-species' ? t : 'generic';
}

export interface RolloutRowInput {
  roads: VRoad[];
  ground?: VGround[];
  buildings: VBuilding[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Every canopy-map crown in the row (the high tier's list). */
  allCrowns: Crown[];
  roundTwo?: RoundTwoRow;
  /** This tier's crowns (a subset of allCrowns at low detail). */
  tierCrowns: Crown[];
  inAnsley?: (x: number, z: number) => boolean;
  /** The all-species preview's filters (trees/rollout.ts RolloutInput.preview), when it is on. */
  preview?: NonNullable<Parameters<typeof planRollout>[0]['preview']>;
  /** Draw every planned species tree as a generic crown (treeMode 'generic'). */
  generic?: boolean;
}

/** Plans a row; returns what the generic World needs before its trees are built. */
export function rolloutRow(input: RolloutRowInput) {
  const full = planRollout({
    roundTwo: input.roundTwo, crowns: input.allCrowns, roads: input.roads, ground: input.ground, bounds: input.bounds, inAnsley: input.inAnsley,
    preview: input.preview,
    buildings: input.buildings.map(b => b.rings[0] as P2[]),
  });
  const tier = tierPlan(full, input.tierCrowns);
  const plan = input.generic ? genericPlan(tier) : tier;
  const addedKeys = new Set(plan.added.map(a => crownKey(a.crown[0], a.crown[1])));
  return {
    plan,
    /** The tier's crowns plus the planted ones, appended so no existing colour seed moves. */
    crowns: [...input.tierCrowns, ...plan.added.map(a => a.crown)],
    replaced: (x: number, z: number) => { const k = crownKey(x, z); return plan.replaced.has(k) || plan.cleared.has(k); },
    crownSize: ((x: number, z: number) => {
      const k = crownKey(x, z);
      const s = plan.enlarged.get(k);
      return s ? { ...s, broadleaf: addedKeys.has(k) } : null;
    }) satisfies NonNullable<World['crownSize']>,
  };
}

interface RowTrees { quality: TreeQuality; trees: { species: RolloutSpecies; p: TreePlacement; y: number; carpet?: boolean }[] }

/**
 * One set of looks for the whole City, not one per board row: each look costs its draws once,
 * however many rows hold its trees (phone-perf's call budget). Rows register their planned trees;
 * the batch rebuilds its looks after mounts and removals, and replays the latest season, detail,
 * night and wet state. City adds `group` to its scene and calls `update` each frame.
 */
export class RolloutBatch {
  readonly group = new THREE.Group();
  private rows = new Map<number, RowTrees>();
  private nextId = 1;
  private looks: NonNullable<ReturnType<typeof createLook>>[] = [];
  private tipMeshes: THREE.Object3D[][] = [];
  private carpet: ReturnType<typeof sharedCarpet> = null;
  private quality: TreeQuality = 'high';
  private state = { doy: null as number | null, far: false, night: 0, wet: 0 };
  private pending = false;
  private materials = new Set<THREE.Material>();
  private maskNear = true;
  private masks: { mesh: THREE.InstancedMesh; mode: InkFoliageMode; remove?: () => void }[] = [];
  private syncMasks() {
    const probe = this.probe();
    const enabled = probe !== 'mask-off' && probe !== 'foliage-off' && (probe === 'mask-on' || this.maskNear);
    for (const m of this.masks) {
      if (enabled && !m.remove) m.remove = inkFoliageMesh(m.mesh, m.mode);
      if (!enabled && m.remove) { m.remove(); m.remove = undefined; }
    }
    this.group.userData.foliageMask = {
      ...this.group.userData.foliageMask, enabled,
      instances: this.masks.reduce((n, m) => n + m.mesh.count, 0),
    };
  }
  private probe() { return treeProbe(typeof location === 'undefined' ? '' : location.search, this.quality); }
  constructor() {
    this.group.name = 'tree rollout';
    this.group.userData.perf = 'trees';
  }
  /** Register a row's species trees; returns its removal. */
  add(rows: RowTrees) {
    const id = this.nextId++;
    this.rows.set(id, rows);
    this.quality = rows.quality;
    this.schedule();
    return () => { if (this.rows.delete(id)) this.schedule(); };
  }
  private schedule() {
    if (this.pending) return;
    this.pending = true;
    queueMicrotask(() => { this.pending = false; this.rebuild(); });
  }
  /** Build now (tests, and before a measurement). */
  flush() { if (this.pending) { this.pending = false; this.rebuild(); } }
  private rebuild() {
    const probe = this.probe();
    for (const m of this.masks) m.remove?.();
    this.masks = [];
    for (const l of this.looks) l.dispose();
    this.carpet?.dispose();
    this.carpet?.mesh.removeFromParent();
    this.looks = [];
    this.tipMeshes = [];
    this.materials.clear();
    const all = [...this.rows.values()].filter(r => r.quality === this.quality).flatMap(r => r.trees);
    const ys = new Map(all.map(t => [crownKey(t.p.x, t.p.z), t.y]));
    const noCarpet = new Set(all.filter(t => t.carpet === false).map(t => crownKey(t.p.x, t.p.z)));
    const groundAt = (x: number, z: number) => ys.get(crownKey(x, z)) ?? null;
    const carpeted: { p: TreePlacement; look: Look }[] = [];
    for (const [id, look] of Object.entries(ROLLOUT_LOOKS) as [RolloutSpecies, Look][]) {
      const placements = all.filter(t => t.species === id).map(t => t.p);
      if (!placements.length) continue;
      // One shared carpet (below), not one per look.
      const renderedLook = this.quality === 'low'
        ? { ...look, options: look.options.map(o => ({ ...o, ink: undefined })) }
        : look;
      const option = look.preferred ?? 'A';
      const l = createLook(placements, renderedLook, option, this.quality, groundAt, { carpet: false });
      if (!l) continue;
      l.group.userData.perf = 'trees';
      const tips: THREE.Object3D[] = [];
      l.group.traverse(o => {
        // Bare limbs inside a crown cast next to nothing: no shadow-pass draw for them.
        if (o.name.endsWith(' limbs')) o.castShadow = false;
        if (o.name.includes(' foliage ')) {
          if (probe === 'shadow-off') o.castShadow = false;
          // The foliage-mask pass also respects mesh visibility.
          if (probe === 'foliage-off') o.visible = false;
          const mode = look.options.find(o => o.id === option)?.ink;
          if (this.quality === 'low' && mode && o instanceof THREE.InstancedMesh) this.masks.push({ mesh: o, mode });
        }
        if (o.name.endsWith(' leaf tips')) tips.push(o);
        if (o instanceof THREE.Mesh) for (const m of [o.material].flat()) this.materials.add(m);
      });
      fitBounds(l.group, placements, groundAt);
      this.group.add(l.group);
      this.looks.push(l);
      this.tipMeshes.push(tips);
      if (look.species.carpet) for (const p of placements) if (!noCarpet.has(crownKey(p.x, p.z))) carpeted.push({ p, look });
    }
    this.carpet = sharedCarpet(carpeted, groundAt);
    if (this.carpet) { this.group.add(this.carpet.mesh); this.materials.add(this.carpet.mesh.material as THREE.Material); }
    this.replay();
    this.syncMasks();
  }
  private replay() {
    const { doy, far, night, wet } = this.state;
    if (doy !== null) this.setSeason(doy);
    this.setDetail({ farTrees: far });
    this.setNight(night);
    this.setWet(wet);
  }
  private showTips() {
    this.looks.forEach((l, i) => { const on = !this.state.far && l.tipped() > 0; for (const t of this.tipMeshes[i]) t.visible = on; });
  }
  get draws() { return this.looks.reduce((n, l) => n + l.draws(), 0) + (this.carpet?.mesh.visible ? 1 : 0); }
  get trees() { return [...this.rows.values()].reduce((n, r) => n + r.trees.length, 0); }
  setSeason(doy: number) { this.state.doy = doy; for (const l of this.looks) l.setSeason(doy); this.carpet?.setSeason(doy); }
  setNight(n: number) { this.state.night = n; for (const l of this.looks) l.setNight(n); }
  setWet(f: number) { this.state.wet = f; for (const m of this.materials) (m as THREE.MeshLambertMaterial).color?.setScalar(1 - 0.3 * f); }
  /** Far detail (phone-perf's gate): leaf tips and the carpet drop out; limbs only while in leaf. */
  setDetail(d: { farTrees?: boolean }) {
    if (d.farTrees === undefined) return;
    this.state.far = d.farTrees;
    for (const l of this.looks) l.setDetail(d);
    if (this.carpet) this.carpet.mesh.visible = !d.farTrees && this.probe() !== 'carpet-off';
    this.showTips();
  }
  /** High detail: near leaf tips follow the camera (cheap: re-sorts only after a 1 m move). */
  update(dt: number, camera: THREE.Camera, orbitDistance?: number) {
    if (this.quality === 'low') {
      // Camera-to-orbit-target distance, not per-tree distance. Preserve the approved
      // Prado (420 m) and terrace (350 m) views; hysteresis prevents boundary chatter.
      if (orbitDistance !== undefined && Number.isFinite(orbitDistance)) {
        const near = this.maskNear ? orbitDistance <= 600 : orbitDistance < 500;
        if (near !== this.maskNear) { this.maskNear = near; this.syncMasks(); }
        (this.group.userData.foliageMask ??= {}).orbitDistance = orbitDistance;
      }
      return;
    }
    for (const l of this.looks) l.update(dt, camera);
    this.showTips();
  }
}

/** The City's rollout batch (one per page). */
export const rolloutBatch = new RolloutBatch();

/** A row's rolled-out species, registered with the batch. Returns null when the row has none. */
export function rolloutSpecies(plan: ReturnType<typeof rolloutRow>['plan'], quality: TreeQuality,
  groundAt: (x: number, z: number) => number | null, batch = rolloutBatch, carpetExclusions: P2[][] = []) {
  const trees = plan.species.flatMap(s => {
    const y = groundAt(s.x, s.z);
    if (y === null) return [];
    const look = ROLLOUT_LOOKS[s.species];
    // One size class per look at low detail: the specimen form only at high.
    const p: TreePlacement = { species: look.species, size: quality === 'low' ? 'mature' : s.size, x: s.x, z: s.z, seed: s.seed, heightM: s.heightM, spreadM: s.spreadM };
    // Some gardens already paint their leaf cover. Suppress intersecting discs entirely:
    // no flat carpet over hard surfaces and no extra low-tier clipping geometry.
    const radius = treeDims(p).spreadM / 2 * 1.1;
    const carpet = s.carpet !== false && !carpetExclusions.some(ring => pointInRing(p.x,p.z,ring)
      || ring.some((a,i) => segDist(p.x,p.z,a,ring[(i+1)%ring.length]) <= radius));
    return [{ species: s.species, p, y, carpet }];
  });
  if (!trees.length) return null;
  const remove = batch.add({ quality, trees });
  return {
    count: trees.length,
    // State is City-wide and replayed by the batch; a row passes it on.
    setSeason(doy: number) { batch.setSeason(doy); },
    setNight(n: number) { batch.setNight(n); },
    setWet(f: number) { batch.setWet(f); },
    setDetail(d: { farTrees?: boolean }) { batch.setDetail(d); },
    dispose() { remove(); },
  };
}

/**
 * Trees a landmark plants at its own height (1180 Peachtree's terrace crape myrtles, 4.5 m,
 * multi-stem), registered with the batch like a row's species trees.
 */
export function rolloutPlantings(spots: { x: number; z: number; y: number }[], quality: TreeQuality, batch = rolloutBatch) {
  if (!spots.length) return null;
  const look = ROLLOUT_LOOKS['crape-myrtle'];
  const remove = batch.add({ quality, trees: spots.map(({ x, z, y }) => ({
    species: 'crape-myrtle' as const, y,
    p: { species: look.species, size: 'mature' as const, x, z, seed: positionSeed(x, z), heightM: 4.5, spreadM: 4 },
  })) });
  return { dispose: remove };
}

/**
 * The looks draw with frustumCulled = false (their instances move with the seasons). Give every
 * mesh a fixed bounding sphere around its trees instead, so off-screen rows and the shadow pass
 * cull them.
 */
function fitBounds(group: THREE.Object3D, placements: TreePlacement[], groundAt: (x: number, z: number) => number | null) {
  const box = new THREE.Box3();
  for (const p of placements) {
    const y = groundAt(p.x, p.z) ?? 0, r = (p.spreadM ?? 10) / 2 + 2, h = (p.heightM ?? 20) + 3;
    box.expandByPoint(new THREE.Vector3(p.x - r, y - 1, p.z - r));
    box.expandByPoint(new THREE.Vector3(p.x + r, y + h, p.z + r));
  }
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  group.traverse(o => {
    if (!(o instanceof THREE.InstancedMesh)) return;
    o.boundingSphere = sphere.clone();
    o.boundingBox = box.clone();
    o.frustumCulled = true;
  });
}

/**
 * One leaf carpet for every carpet-dropping species in a row (one draw), tagged as landscape for
 * the perf report: each tree's disc follows its own look's palette (share and colour), as the
 * per-look carpet in createLook does.
 */
function sharedCarpet(trees: { p: TreePlacement; look: Look }[], groundAt: (x: number, z: number) => number | null) {
  const placed = trees.flatMap(t => { const y = groundAt(t.p.x, t.p.z); return y === null ? [] : [{ ...t, y, r: treeDims(t.p).spreadM / 2 }]; });
  if (!placed.length) return null;
  const mat = new THREE.MeshLambertMaterial({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2), mat, placed.length);
  mesh.name = 'carpet';
  mesh.userData.perf = 'landscape';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  placed.forEach((_, i) => mesh.setColorAt(i, new THREE.Color('#9c8460')));
  const box = new THREE.Box3();
  for (const t of placed) { box.expandByPoint(v.set(t.p.x - t.r * 1.1, t.y - 1, t.p.z - t.r * 1.1)); box.expandByPoint(v.set(t.p.x + t.r * 1.1, t.y + 1, t.p.z + t.r * 1.1)); }
  mesh.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
  mesh.boundingBox = box;
  return {
    mesh,
    setSeason(doy: number) {
      placed.forEach((t, i) => {
        const palette = t.look.varieties ? t.look.varieties[Math.floor(hash01(t.p.seed, 14) * t.look.varieties.length)] : t.look.palette;
        const p = palette(doy, (hash01(t.p.seed, 2) * 2 - 1) * t.look.species.offsetDays);
        if (p.carpet <= 0.01) { mesh.setMatrixAt(i, zero); return; }
        const r = t.r * 1.1 * (0.6 + 0.4 * p.carpet);
        mesh.setMatrixAt(i, m.compose(v.set(t.p.x, t.y + 0.05, t.p.z), q, sc.set(r, 1, r)));
        mesh.setColorAt(i, p.carpetColour);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    dispose() { mesh.geometry.dispose(); mesh.dispose(); mat.dispose(); },
  };
}
