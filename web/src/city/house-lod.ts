import * as THREE from 'three';
import { runSync } from '../core/slice';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { landmarkBatchOff } from '../materials/landmark-batch';
import { World, type BuildingFinish, type VBuilding, type VData } from '../vignette/world';

/**
 * Houses by distance. Every planned house is drawn twice, per tile: a far version (walls and a
 * bare roof) and the full near version (eaves, porches, windows, chimneys). The near version is
 * built only when the camera first comes within range of its tile, so the wide view never holds it.
 *
 * The switch sits where a 0.5 m eave is about a pixel (about 1 km with City's 22° lens), measured to
 * the nearest house in the tile, so it doesn't pop; a 10 % band either side stops it flickering.
 */
export const SWITCH_M = 1000, TILE_M = 800;
/** Far tiles merge into blocks of SUPER x SUPER tiles, drawn as one mesh while every tile in it is far. */
export const SUPER = 3;
/** `?perf&blocks=off` (or `batch=off`) draws every far tile on its own, for A/B runs from one build. */
const blocksOff = landmarkBatchOff || (() => {
  const p = new URLSearchParams(globalThis.location?.search ?? '');
  return p.has('perf') && p.get('perf') !== '0' && p.get('perf') !== 'off' && p.get('blocks') === 'off';
})();
type Bounds = VData['bounds'];
type Finish = (b: VBuilding) => BuildingFinish | undefined;
export type HouseLodOptions = {
  houses: VBuilding[]; bounds: Bounds; ground: (x: number, z: number) => number | null;
  foundation: (b: VBuilding) => number | null; near: Finish; far: Finish; roofUnits: number;
  /** A dev switch: 'near' or 'far' pins every tile. */
  force?: 'near' | 'far';
};

// One near build per frame at most, so a camera jump into Midtown never stalls a frame on every tile.
let lastBuildFrame = -1, frame = 0;
// Set when a tile swaps versions or gains its near houses; City redraws its (manual) shadow map.
let changed = false;
export function takeHouseLodChange() { const c = changed; changed = false; frame++; return c; }

function build(houses: VBuilding[], o: HouseLodOptions, finish: Finish) {
  class Houses extends World {
    override ground(x: number, z: number) { return o.ground(x, z) ?? 0; }
  }
  const world = new Houses({ bounds: o.bounds, buildings: houses, roads: [], rail: [] } as unknown as VData, null,
    { terrain: 'flat', clumps: 3, lightMapMax: 256 } as never);
  world.buildBuildings(o.foundation, o.roofUnits, finish);
  // Drop empty meshes (no lit glass or roof clutter on far houses), so they never cost a draw.
  for (const m of [...world.group.children]) {
    const mesh = m as THREE.Mesh, g = mesh.geometry as THREE.BufferGeometry | undefined;
    const n = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : g?.getAttribute('position')?.count ?? 1;
    if (n) continue;
    if ((m as THREE.InstancedMesh).isInstancedMesh) (m as THREE.InstancedMesh).dispose();
    g?.dispose();
    for (const mat of Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []) mat.dispose();
    m.removeFromParent();
  }
  return world;
}

const materials = (o: THREE.Object3D) => {
  const out: THREE.Material[] = [];
  o.traverse(m => { const mat = (m as THREE.Mesh).material; if (mat) out.push(...(Array.isArray(mat) ? mat : [mat])); });
  return out;
};

/** A LOD whose switch is measured to the nearest point of its houses' bounds, not to its centre. */
export class HouseTile extends THREE.LOD {
  nearWorld: World | null = null;
  readonly near = new THREE.Group();
  private showingNear = false;
  /** Whether the near version is up (after the last update). */
  get isNear() { return this.showingNear; }
  private readonly box = new THREE.Box3();
  constructor(readonly houses: VBuilding[], readonly o: HouseLodOptions, readonly farWorld: World,
    readonly state: { night: number; wet: number }) {
    super();
    for (const h of houses) for (const [x, z] of h.rings[0]) this.box.expandByPoint(new THREE.Vector3(x, o.ground(x, z) ?? 0, z));
    this.box.max.y += 15;
    this.add(this.near, farWorld.group);
    this.near.visible = false;
    this.autoUpdate = true;
  }
  ensureNear() {
    if (this.nearWorld) return;
    this.nearWorld = build(this.houses, this.o, this.o.near);
    this.nearWorld.setNight(this.state.night);
    this.nearWorld.setWet(this.state.wet);
    // City clips the board's edges once, on load; give the new materials the far version's planes.
    const far = materials(this.farWorld.group).find(m => m.clippingPlanes?.length);
    if (far) for (const m of materials(this.nearWorld.group)) { m.clippingPlanes = far.clippingPlanes; m.clipShadows = far.clipShadows; }
    this.near.add(this.nearWorld.group);
    this.near.updateMatrixWorld(true);
    changed = true;
  }
  override update(camera: THREE.Camera) {
    const d = this.box.distanceToPoint(camera.getWorldPosition(new THREE.Vector3()));
    const force = this.o.force;
    let want = force ? force === 'near' : this.showingNear ? d < SWITCH_M * 1.1 : d < SWITCH_M * .9;
    if (want && !this.nearWorld) {
      if (lastBuildFrame === frame && force !== 'near') want = false;
      else { lastBuildFrame = frame; this.ensureNear(); }
    }
    if (want !== this.showingNear) changed = true;
    this.showingNear = want;
    this.near.visible = want;
    this.farWorld.group.visible = !want;
  }
}

/** The one plain mesh a far tile draws, or null when it has none or several. */
function soleMesh(world: World) {
  const meshes = world.group.children.filter((m): m is THREE.Mesh => (m as THREE.Mesh).isMesh);
  if (meshes.length !== 1 || world.group.children.length !== 1) return null;
  const m = meshes[0];
  return (m as THREE.InstancedMesh).isInstancedMesh || Array.isArray(m.material) ? null : m;
}

/**
 * A block of house tiles. While every tile in it shows its far version, the block draws all of
 * them as one mesh; otherwise each tile draws its own. Both read the same vertex buffers (each
 * tile's far mesh is a range of the block's), so nothing is stored twice. A LOD only so the
 * renderer updates it, before its tiles, in the same pass.
 */
export class HouseBlock extends THREE.LOD {
  constructor(readonly tiles: HouseTile[], readonly merged: THREE.Mesh) {
    super();
    for (const t of tiles) t.autoUpdate = false;
    this.add(...tiles, merged);
    this.autoUpdate = true;
  }
  override update(camera: THREE.Camera) {
    for (const t of this.tiles) t.update(camera);
    const far = this.tiles.every(t => !t.isNear);
    this.merged.visible = far;
    if (far) for (const t of this.tiles) t.farWorld.group.visible = false;
  }
}

/** Merges the tiles' sole far meshes into one buffer; null when they cannot share a draw. */
function block(tiles: HouseTile[]) {
  const meshes = tiles.map(t => soleMesh(t.farWorld));
  if (meshes.some(m => !m)) return null;
  const ms = meshes as THREE.Mesh[];
  const mat = ms[0].material as THREE.Material;
  const key = (m: THREE.Mesh) => {
    const g = m.geometry, x = m.material as THREE.Material;
    return [x.type, x.customProgramCacheKey(), m.castShadow, m.receiveShadow, !!g.index, m.matrix.equals(ms[0].matrix),
      ...Object.entries(g.attributes).sort(([a], [b]) => a < b ? -1 : 1).map(([n, a]) => `${n}${a.itemSize}${(a as THREE.BufferAttribute).array.constructor.name}`)].join('|');
  };
  if (ms.some(m => key(m) !== key(ms[0]))) return null;
  const merged = mergeGeometries(ms.map(m => m.geometry));
  if (!merged) return null;
  const indexed = !!merged.index;
  const range = (start: number, count: number, from?: THREE.BufferGeometry) => {
    const g = new THREE.BufferGeometry();
    for (const [n, a] of Object.entries(merged.attributes)) g.setAttribute(n, a);
    if (merged.index) g.setIndex(merged.index);
    g.setDrawRange(start, count);
    if (from) {
      from.computeBoundingBox(); from.computeBoundingSphere();
      g.boundingBox = from.boundingBox!.clone(); g.boundingSphere = from.boundingSphere!.clone();
    }
    return g;
  };
  let start = 0;
  const box = new THREE.Box3();
  for (const m of ms) {
    const old = m.geometry;
    const count = indexed ? old.index!.count : old.getAttribute('position').count;
    m.geometry = range(start, count, old);
    box.union(m.geometry.boundingBox!);
    start += count;
    old.dispose();
  }
  const all = range(0, start);
  all.boundingBox = box;
  all.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
  const mesh = new THREE.Mesh(all, mat);
  mesh.name = 'houses (far block)';
  mesh.matrix.copy(ms[0].matrix);
  mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
  mesh.castShadow = ms[0].castShadow;
  mesh.receiveShadow = ms[0].receiveShadow;
  // The white arrival model whitens tagged buildings; a block is too wide to pass its size test.
  mesh.userData.building = ms[0].userData.building;
  return new HouseBlock(tiles, mesh);
}

/** Groups houses into tiles by footprint centre, each a LOD of far and (lazily) near versions. */
export function houseLod(o: HouseLodOptions) {
  return runSync(buildHouseLod(o));
}

/** houseLod() as a build that yields per tile and per merged block (core/slice.ts). */
export function* buildHouseLod(o: HouseLodOptions) {
  const cells = new Map<string, VBuilding[]>();
  for (const h of o.houses) {
    const ring = h.rings[0];
    const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const key = `${Math.floor(cx / TILE_M)},${Math.floor(cz / TILE_M)}`;
    (cells.get(key) ?? cells.set(key, []).get(key)!).push(h);
  }
  const group = new THREE.Group();
  group.name = 'houses';
  // The phone-perf report (docs/perf.md) splits scene memory and triangles by this tag.
  group.userData.perf = 'buildings';
  const state = { night: 0, wet: 0 };
  const tiles: HouseTile[] = [];
  const blocks = new Map<string, HouseTile[]>();
  for (const [key, houses] of cells) {
    const tile = new HouseTile(houses, o, build(houses, o, o.far), state);
    if (o.force === 'near') tile.ensureNear();
    tiles.push(tile);
    yield 'house tile';
    const [cx, cz] = key.split(',').map(Number);
    const bk = `${Math.floor(cx / SUPER)},${Math.floor(cz / SUPER)}`;
    (blocks.get(bk) ?? blocks.set(bk, []).get(bk)!).push(tile);
  }
  const merged: THREE.Mesh[] = [];
  for (const members of blocks.values()) {
    const b = members.length > 1 && !o.force && !blocksOff ? block(members) : null;
    if (b) { group.add(b); merged.push(b.merged); } else group.add(...members);
    yield 'house block';
  }
  return {
    group, tiles,
    setNight(n: number) { state.night = n; for (const t of tiles) { t.farWorld.setNight(n); t.nearWorld?.setNight(n); } },
    setWet(w: number) { state.wet = w; for (const t of tiles) { t.farWorld.setWet(w); t.nearWorld?.setWet(w); } },
    dispose() { for (const t of tiles) { t.farWorld.dispose(); t.nearWorld?.dispose(); } for (const m of merged) m.geometry.dispose(); group.removeFromParent(); },
  };
}
