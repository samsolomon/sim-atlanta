import { neighborhoodTrees, type NeighborhoodCanopy } from './neighborhood-trees';
import * as THREE from 'three';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import type { JoiningEdge, TerrainQuality } from '../terrain/surface';
import type { TerrainCity } from '../terrain/transport-data';
import { marchonFinishes } from './marchon-frontage';
import { cityRoadHeight } from './road-height';
import { PAL } from '../vignette/world';

import { eastBounds, eastJoin } from './board-footprint';

type Bounds = GroundManifest['bounds'];

export function verifyJoin(west: GroundGrid, east: GroundGrid) {
  const m = east.manifest,
    w = west.manifest;
  if (
    Object.entries(eastBounds).some(([k, v]) => m.bounds[k as keyof Bounds] !== v) ||
    w.bounds.maxX !== m.bounds.minX ||
    w.stepM !== 5 ||
    m.stepM !== 5 ||
    w.vertical.sceneZeroNavd88M !== m.vertical.sceneZeroNavd88M ||
    w.horizontal?.originLat !== m.horizontal?.originLat ||
    w.horizontal?.originLon !== m.horizontal?.originLon ||
    !m.horizontal ||
    w.horizontal?.radiusM !== m.horizontal.radiusM
  )
    throw new Error('Incompatible King Memorial ground registration');
  for (let row = 0; row < m.rows; row++) {
    const h = east.node(row, 0);
    if (h === null || h !== west.sample(eastJoin.x, m.bounds.minZ + row * m.stepM))
      throw new Error('King Memorial ground differs at the downtown edge');
  }
}

export async function loadEast(
  base: string,
  west: GroundGrid,
  quality: TerrainQuality,
  bottomY: number,
  signal: AbortSignal,
  extraJoin?: JoiningEdge | JoiningEdge[],
) {
  async function asset(name: string) {
    const response = await fetch(`${base}/scene/king-memorial/${name}`, { signal });
    if (!response.ok) throw new Error(`King Memorial ${name} (${response.status})`);
    return response;
  }
  const [manifest, bytes, context] = await Promise.all([
    asset('ground.json').then((r) => r.json() as Promise<GroundManifest>),
    asset('ground.i16').then((r) => r.arrayBuffer()),
    asset('context.json').then(
      (r) => r.json() as Promise<TerrainCity & NeighborhoodCanopy>,
    ),
  ]);
  signal.throwIfAborted();
  // The two static files can come from different browser cache generations.
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, '0')).join('');
  if (hex !== manifest.sha256) throw new Error('King Memorial ground checksum mismatch');
  signal.throwIfAborted();
  const grid = new GroundGrid(manifest, bytes);
  verifyJoin(west, grid);
  if (!context.buildings?.length || !context.roads?.length || !Array.isArray(context.trees))
    throw new Error('Missing King Memorial neighborhood');
  const area = createDowntownTerrain(grid, context, neighborhoodTrees(context, quality), {
    simpleLeafClumps: context.treeLowCount !== undefined,
    quality,
    bottomY,
    join: extraJoin ? [eastJoin, ...(Array.isArray(extraJoin) ? extraJoin : [extraJoin])] : eastJoin,
    finishFor: marchonFinishes(context.buildings),
  });
  return { ...area, connectorBoard: { city: context, roadHeight: cityRoadHeight(context, area.groundAt) } };
}

/** One walnut base under the L-shaped board, with the original eight-metre outside lip. */
export function joinedPlinth(b: Bounds, bottom: number, northZ = eastBounds.minZ) {
  const e = eastBounds,
    lip = 8,
    x = b.maxX + lip;
  const shape = new THREE.Shape();
  const outline = [
    [b.minX - lip, b.minZ - lip],
    [x, b.minZ - lip],
    [x, northZ - lip],
    [e.maxX + lip, northZ - lip],
    [e.maxX + lip, e.maxZ + lip],
    [x, e.maxZ + lip],
    [x, b.maxZ + lip],
    [b.minX - lip, b.maxZ + lip],
  ];
  outline.forEach(([px, pz], i) => (i ? shape.lineTo(px, -pz) : shape.moveTo(px, -pz)));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: PAL.walnut }));
  mesh.position.y = bottom - 6;
  mesh.receiveShadow = true;
  return mesh;
}
