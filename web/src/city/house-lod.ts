import * as THREE from 'three';
import type { P2 } from '../vignette/geom';
import { World, type BuildingFinish, type VBuilding, type VData } from '../vignette/world';

/**
 * Houses by distance. Every planned house is drawn twice, per tile: a far version (walls and a
 * bare roof) and the full near version (eaves, porches, windows, chimneys). The near version is
 * built only when the camera first comes within range of its tile, so the wide view never holds it.
 *
 * The switch sits where a 0.5 m eave is about a pixel (about 1 km with City's 22° lens), so it
 * doesn't pop; a 10 % band either side stops it flickering.
 */
export const SWITCH_M = 1000, TILE_M = 800;
type Bounds = VData['bounds'];
type Finish = (b: VBuilding) => BuildingFinish | undefined;
export type HouseLodOptions = {
  houses: VBuilding[]; bounds: Bounds; ground: (x: number, z: number) => number | null;
  foundation: (b: VBuilding) => number | null; near: Finish; far: Finish; roofUnits: number;
  /** A dev switch: 'near' or 'far' pins every tile. */
  force?: 'near' | 'far';
};

function build(houses: VBuilding[], o: HouseLodOptions, finish: Finish) {
  class Houses extends World {
    override ground(x: number, z: number) { return o.ground(x, z) ?? 0; }
  }
  const world = new Houses({ bounds: o.bounds, buildings: houses, roads: [], rail: [] } as unknown as VData, null,
    { terrain: 'flat', clumps: 3, lightMapMax: 256 } as never);
  world.buildBuildings(o.foundation, o.roofUnits, finish);
  // Drop empty meshes (no lit glass on far houses), so they never cost a draw.
  for (const m of [...world.group.children]) {
    const g = (m as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    const n = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : g?.getAttribute('position')?.count ?? 1;
    if (!n) { g?.dispose(); m.removeFromParent(); }
  }
  return world;
}

class HouseTile extends THREE.LOD {
  nearWorld: World | null = null;
  readonly near = new THREE.Group();
  constructor(readonly houses: VBuilding[], readonly o: HouseLodOptions, readonly farWorld: World,
    readonly centre: THREE.Vector3, readonly state: { night: number; wet: number }) {
    super();
    // LOD measures from its own position; the geometry is in world coordinates, so offset the children.
    this.position.copy(centre);
    this.near.position.copy(centre).negate();
    farWorld.group.position.copy(centre).negate();
    this.addLevel(this.near, 0, .1);
    this.addLevel(farWorld.group, o.force === 'near' ? Infinity : o.force === 'far' ? 0 : SWITCH_M, .1);
    if (o.force === 'far') this.levels.shift();
    this.autoUpdate = true;
  }
  ensureNear() {
    if (this.nearWorld) return;
    this.nearWorld = build(this.houses, this.o, this.o.near);
    this.nearWorld.setNight(this.state.night);
    this.nearWorld.setWet(this.state.wet);
    this.near.add(this.nearWorld.group);
  }
  override update(camera: THREE.Camera) {
    if (!this.nearWorld && this.o.force !== 'far') {
      const d = camera.getWorldPosition(new THREE.Vector3()).distanceTo(this.getWorldPosition(new THREE.Vector3()));
      if (this.o.force === 'near' || d < SWITCH_M * 1.1) this.ensureNear();
    }
    super.update(camera);
  }
}

/** Groups houses into tiles by footprint centre, each a LOD of far and (lazily) near versions. */
export function houseLod(o: HouseLodOptions) {
  const cells = new Map<string, VBuilding[]>();
  for (const h of o.houses) {
    const ring = h.rings[0];
    const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const key = `${Math.floor(cx / TILE_M)},${Math.floor(cz / TILE_M)}`;
    (cells.get(key) ?? cells.set(key, []).get(key)!).push(h);
  }
  const group = new THREE.Group();
  group.name = 'houses';
  group.userData.perf = 'buildings';
  const state = { night: 0, wet: 0 };
  const tiles: HouseTile[] = [];
  for (const houses of cells.values()) {
    const far = build(houses, o, o.far);
    const pts: P2[] = houses.flatMap(h => h.rings[0]);
    const x = pts.reduce((s, p) => s + p[0], 0) / pts.length, z = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const tile = new HouseTile(houses, o, far, new THREE.Vector3(x, o.ground(x, z) ?? 0, z), state);
    if (o.force === 'near') tile.ensureNear();
    tiles.push(tile);
    group.add(tile);
  }
  return {
    group, tiles,
    setNight(n: number) { state.night = n; for (const t of tiles) { t.farWorld.setNight(n); t.nearWorld?.setNight(n); } },
    setWet(w: number) { state.wet = w; for (const t of tiles) { t.farWorld.setWet(w); t.nearWorld?.setWet(w); } },
    dispose() { for (const t of tiles) { t.farWorld.dispose(); t.nearWorld?.dispose(); } group.removeFromParent(); },
  };
}
