import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import type { TerrainQuality } from '../terrain/surface';
import { createSurfaceTransport } from '../terrain/transport';
import type { TerrainCity } from '../terrain/transport-data';
import { irwinHouseFinish } from './irwin-houses';
import { edgewoodFinish } from './edgewood-block';
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

export async function loadNorth(base: string, west: GroundGrid, south: GroundGrid, quality: TerrainQuality, bottomY: number, signal: AbortSignal) {
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
  const grid = new GroundGrid(manifest, bytes);
  verifyNorth(west, south, grid);
  if (!context.buildings?.length || !context.roads?.length || !Array.isArray(context.trees)) throw new Error('Missing Sweet Auburn context');
  const area = createDowntownTerrain(grid, context, context.trees, {
    quality, bottomY, join: [northWestJoin, northSouthJoin],
    finishFor: b => edgewoodFinish(b) ?? irwinHouseFinish(b),
  });
  try {
    const roads = context.roads.filter(r => r.bridge && !r.tunnel).map(r => ({
      kind: 'bridge' as const, cls: r.cls, name: r.name, sub: r.sub ?? undefined, pts: r.pts,
    }));
    const decks = createSurfaceTransport({ ...context, terrainTransport: { version: 1, roads, rail: [] } }, grid, area.groundAt);
    area.group.add(decks.group);
    return { ...area, dispose() { decks.dispose(); area.dispose(); } };
  } catch (error) {
    area.dispose();
    throw error;
  }
}
