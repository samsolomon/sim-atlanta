import { residential } from './residential';
import { joinedPlacementGround } from './north-seam-ground';
import paint from './fixtures/north-seam-paint.json';
import inventory from './fixtures/north-seam-buildings.json';
import { World, type VBuilding } from '../vignette/world';
import { foundation } from '../terrain/model';
import type { TerrainCity } from '../terrain/transport-data';
import type { TerrainQuality } from '../terrain/surface';
import type { TrafficArea } from '../square-board/sections';
import type { P2 } from '../vignette/geom';

export const sharedIds = new Set(inventory.map(entry => entry.building.id));
export function joinedPaint(row: keyof typeof paint.rows, city: TerrainCity) {
  const roads = city.roads.slice();
  for (const {roadIndex, pts} of paint.rows[row].roads) {
    roads[roadIndex] = {...roads[roadIndex], pts: pts as P2[]};
  }
  return roads;
}

export function mountSeamBuildings(north: TrafficArea, south: TrafficArea, quality: TerrainQuality) {
  const bounds = {...north.bounds, maxZ: south.bounds.maxZ};
  const sample = joinedPlacementGround(north.groundAt, south.groundAt, bounds);
  const roads = [...south.connectorBoard.city.roads, ...north.connectorBoard.city.roads];
  const footprints = [...[...north.connectorBoard.city.buildings, ...south.connectorBoard.city.buildings].filter(b => !sharedIds.has(b.id)),
    ...inventory.map(entry => entry.building as VBuilding)];
  const footing = (building: VBuilding) => foundation(building.rings, sample, north.grid.manifest.stepM / 2);
  class Buildings extends World {
    override ground(x: number, z: number) { return sample(x,z)!; }
  }
  const owners = [['r16',north],['brookwood-station',south]] as const;
  const cleanup: (() => void)[] = [];
  for (const [id, area] of owners) {
    const buildings = inventory.filter(entry => entry.owner === id).map(entry => entry.building as VBuilding);
    const city = {...area.connectorBoard.city, roads, bounds, buildings};
    const homes = residential(city, undefined, sample, footing, quality, undefined, footprints);
    const world = new Buildings(homes.city, null, { terrain: 'flat', cityFacades:true, clumps:3, lightMapMax:1024 });
    world.buildBuildings(footing, quality === 'low' ? 3 : 8, homes.finishFor, quality);
    world.group.name = 'Shared seam buildings ' + id;
    world.group.userData.sourceIds = buildings.map(b => b.id);
    area.group.add(world.group);
    cleanup.push(() => { world.group.removeFromParent(); world.dispose(); });
    const yards = homes.yards();
    if (!yards) continue;
    area.group.add(yards.group);
    cleanup.push(() => { yards.group.removeFromParent(); yards.dispose(); });
    for (const board of [north,south]) {
      board.carve(yards.yields.filter(y => Math.min(...y.ring.map(p => p[1])) <= board.bounds.maxZ &&
        Math.max(...y.ring.map(p => p[1])) >= board.bounds.minZ));
    }
  }
  return () => cleanup.forEach(dispose => dispose());
}
