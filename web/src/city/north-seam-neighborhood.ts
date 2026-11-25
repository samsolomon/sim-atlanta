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

function buildingLayer(area: TrafficArea, city: TerrainCity, sample: (x:number,z:number) => number | null,
  footprints: VBuilding[], quality: TerrainQuality, name: string) {
  const footing = (b: VBuilding) => foundation(b.rings, sample, area.grid.manifest.stepM / 2);
  class Buildings extends World {
    override ground(x: number, z: number) { return sample(x,z)!; }
  }
  const homes = residential(city, undefined, sample, footing, quality, undefined, footprints);
  const world = new Buildings(homes.city, null, { terrain: 'flat', cityFacades:true, clumps:3, lightMapMax:1024 });
  world.buildBuildings(footing, quality === 'low' ? 3 : 8, homes.finishFor, quality);
  world.group.name = name;
  world.group.userData.sourceIds = city.buildings.map(b => b.id);
  const yards = homes.yards();
  area.group.add(world.group);
  if (yards) area.group.add(yards.group);
  return {
    yields: yards?.yields ?? [],
    show(visible: boolean) { world.group.visible = visible; if (yards) yards.group.visible = visible; },
    dispose() { world.group.removeFromParent(); world.dispose(); yards?.group.removeFromParent(); yards?.dispose(); }
  };
}

const stationLayers = new WeakMap<TrafficArea, ReturnType<typeof buildingLayer>>();

export function mountStationFragments(station: TrafficArea, quality: TerrainQuality) {
  const city = station.connectorBoard.city;
  const layer = buildingLayer(station, {...city, buildings: city.buildings.filter(b => sharedIds.has(b.id))},
    station.groundAt, city.buildings, quality, 'Station seam fragments');
  stationLayers.set(station, layer);
  return () => { stationLayers.delete(station); layer.dispose(); };
}

export function mountSeamBuildings(north: TrafficArea, south: TrafficArea, quality: TerrainQuality) {
  const bounds = {...north.bounds, maxZ: south.bounds.maxZ};
  const sample = joinedPlacementGround(north.groundAt, south.groundAt, bounds);
  const roads = [...south.connectorBoard.city.roads, ...north.connectorBoard.city.roads];
  const footprints = [...north.connectorBoard.city.buildings, ...south.connectorBoard.city.buildings]
    .filter(b => !sharedIds.has(b.id)).concat(inventory.map(entry => entry.building as VBuilding));
  const owners = [['r16',north],['brookwood-station',south]] as const;
  const layers = owners.map(([id, area]) => {
    const buildings = inventory.filter(entry => entry.owner === id).map(entry => entry.building as VBuilding);
    const city = {...area.connectorBoard.city, roads, bounds, buildings};
    const layer = buildingLayer(area, city, sample, footprints, quality, 'Shared seam buildings ' + id);
    for (const board of [north,south]) {
      board.carve(layer.yields.filter(y => Math.min(...y.ring.map(p => p[1])) <= board.bounds.maxZ &&
        Math.max(...y.ring.map(p => p[1])) >= board.bounds.minZ));
    }
    return layer;
  });
  stationLayers.get(south)?.show(false);
  return () => { for (const layer of layers) layer.dispose(); stationLayers.get(south)?.show(true); };
}
