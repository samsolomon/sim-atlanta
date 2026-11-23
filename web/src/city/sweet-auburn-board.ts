import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import type { JoiningEdge, TerrainQuality } from '../terrain/surface';
import { createSurfaceTransport } from '../terrain/transport';
import type { TerrainCity } from '../terrain/transport-data';
import { wheatStreetId, wheatStreetTower } from './wheat-street-towers';
import { bigBethelId, heritageId, sanctuaryShells } from './auburn-sanctuaries';
import { auburnSigns } from './auburn-signs';
import { oddFellowsFinish } from './odd-fellows';
import { irwinHouseFinish } from './irwin-houses';
import { edgewoodFinish } from './edgewood-block';
import { cityRoadHeight } from './road-height';
import { auburnGround, auburnTransport, leonardTateWalls } from './sweet-auburn-transport';
import { northBounds, northSouthJoin, northWestJoin } from './board-footprint';

export function verifyNorth(west: GroundGrid, south: GroundGrid, north: GroundGrid) {
  const m = north.manifest, b = m.bounds;
  if (Object.entries(northBounds).some(([k,v]) => b[k as keyof typeof b] !== v) ||
      west.manifest.bounds.maxX !== b.minX || south.manifest.bounds.minZ !== b.maxZ)
    throw new Error('Sweet Auburn bounds do not meet the neighboring boards');
  for (const { manifest: neighbor } of [west, south]) {
    if (m.stepM !== 5 || neighbor.stepM !== m.stepM || !m.horizontal || !neighbor.horizontal ||
        m.horizontal.originLat !== neighbor.horizontal.originLat || m.horizontal.originLon !== neighbor.horizontal.originLon ||
        m.horizontal.radiusM !== neighbor.horizontal.radiusM || m.vertical.sceneZeroNavd88M !== neighbor.vertical.sceneZeroNavd88M)
      throw new Error('Sweet Auburn ground registration differs');
  }
  function match(other: GroundGrid, x: number, z: number) {
    const h = north.sample(x, z);
    if (h === null || h !== other.sample(x, z)) throw new Error('Sweet Auburn shared ground node differs');
  }
  for (let z = b.minZ; z <= b.maxZ; z += m.stepM) match(west, b.minX, z);
  for (let x = b.minX; x <= b.maxX; x += m.stepM) match(south, x, b.maxZ);
}

export async function loadNorth(base: string, west: GroundGrid, south: GroundGrid, quality: TerrainQuality, bottomY: number, signal: AbortSignal, extraJoins: JoiningEdge[] = []) {
  async function asset(name: string) {
    const response = await fetch(base + '/scene/sweet-auburn/' + name, { signal });
    if (!response.ok) throw new Error('Missing Sweet Auburn asset ' + name);
    return response;
  }
  const [manifest, bytes, context] = await Promise.all([
    asset('ground.json').then(r => r.json() as Promise<GroundManifest>),
    asset('ground.i16').then(r => r.arrayBuffer()),
    asset('context.json').then(r => r.json() as Promise<TerrainCity & { trees: [number,number,number,number][] }>),
  ]);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  signal.throwIfAborted();
  if (Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2,'0')).join('') !== manifest.sha256)
    throw new Error('Sweet Auburn ground checksum mismatch');
  if (!context.buildings?.length || !context.roads?.length || !Array.isArray(context.trees)) throw new Error('Missing Sweet Auburn context');
  const grid = auburnGround(manifest, bytes);
  verifyNorth(west, south, grid);
  const ids=new Set(context.buildings.filter(b => (b.id===heritageId || b.id===bigBethelId)
    && b.rings[0]?.length >= 3 && b.rings[0].every(([x,z])=>grid.sample(x,z)!==null)).map(b=>b.id));
  const city = auburnTransport({ ...context, buildings: context.buildings.filter(b=>!ids.has(b.id)) });
  const area = createDowntownTerrain(grid, city, context.trees, {
    quality, bottomY, join: [northWestJoin, northSouthJoin, ...extraJoins],
    finishFor: b => b.id === wheatStreetId ? wheatStreetTower : oddFellowsFinish(b) ?? edgewoodFinish(b) ?? irwinHouseFinish(b),
  });
  try {
    const decks = createSurfaceTransport(city, grid, area.groundAt);
    const walls = leonardTateWalls(city, new GroundGrid(manifest, bytes), grid);
    const signs=auburnSigns(ids,manifest.vertical.sceneZeroNavd88M);
    const shells=sanctuaryShells(ids,manifest.vertical.sceneZeroNavd88M);
    area.scenery.add(shells.group);
    area.group.add(decks.group,signs.group,walls);
    return {
      ...area,
      connectorBoard: { city, roadHeight: cityRoadHeight(city, area.groundAt, decks.deckAt) },
      setNight(n:number) { area.setNight(n); shells.setNight(n); signs.setNight(n); },
      dispose() { walls.geometry.dispose(); walls.material.dispose(); signs.dispose(); shells.dispose(); decks.dispose(); area.dispose(); },
    };
  } catch (error) {
    area.dispose();
    throw error;
  }
}
