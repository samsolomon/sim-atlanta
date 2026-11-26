import { neighborhoodTrees, type NeighborhoodCanopy } from './neighborhood-trees';
import * as THREE from 'three';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { buildDowntownTerrain, createDowntownTerrain } from '../terrain/model';
import { runBudgeted, runSync, sliceBudget, sliceInput, sliceStats, type Build } from '../core/slice';
import type { JoiningEdge, TerrainQuality } from '../terrain/surface';
import { buildSurfaceTransport, createSurfaceTransport } from '../terrain/transport';
import type { TerrainCity, TransportRun } from '../terrain/transport-data';
import { drawGrantStreet, grantBoardRoads, GrantStreetGround, grantFormation, grantLighting } from './grant-street';
import kingRail from './fixtures/king-rail.json';
import { segDist, type P2 } from '../vignette/geom';

/** The board's freight track (king_memorial_rail.py); `sub` is the OSM service (yard, siding). */
const rail: TransportRun[] = kingRail.map(run => ({ ...run, kind: run.kind as TransportRun['kind'], sub: run.sub ?? undefined, pts: run.pts as P2[] }));
/** Half the ballast width (terrain/transport.ts draws 4.2 m). */
const BALLAST_HALF = 2.1;
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
  const grid = new GrantStreetGround(manifest, bytes);
  verifyJoin(west, grid);
  if (!context.buildings?.length || !context.roads?.length || !Array.isArray(context.trees))
    throw new Error('Missing King Memorial neighborhood');
  const budget = sliceBudget();
  // One build, two drivers: a few ms per frame, or straight through under ?slice=0 and in Node.
  function* build() {
  // The context was baked without rail, so its canopy never kept off the freight corridor:
  // drop crowns that would stand on the ballast.
  const onTrack = ([x, z, , radius]: [number, number, number, number]) => rail.some(run =>
    run.pts.some((p, i) => i > 0 && segDist(x, z, run.pts[i - 1], p) < Math.min(radius, 3) + BALLAST_HALF));
  const trees = context.trees.filter(t => !onTrack(t));
  // The low tier draws the first treeLowCount crowns; keep that set, less the removed ones.
  const treeLowCount = context.treeLowCount === undefined ? undefined
    : context.trees.slice(0, context.treeLowCount).filter(t => !onTrack(t)).length;
  const grantNight = { value: 0 };
  const grantTunnel = context.roads.find(r => r.tunnel && r.name === 'Grant Street Southeast');
  const zero = manifest.vertical.sceneZeroNavd88M;
  yield 'canopy';
  const area = yield* buildDowntownTerrain(grid, context, neighborhoodTrees({ ...context, trees, treeLowCount }, quality), {
    // Trees join the City-wide batch only when the whole board is built.
    deferTrees: true,
    dayOfYear: budget ? sliceInput.dayOfYear : undefined,
    boardRoads: grantBoardRoads(context.roads),
    boardDetails(builder, ground, material) { drawGrantStreet(builder, ground, zero); grantLighting(material, grantNight, zero); },
    simpleLeafClumps: context.treeLowCount !== undefined,
    quality,
    bottomY,
    join: extraJoin ? [eastJoin, ...(Array.isArray(extraJoin) ? extraJoin : [extraJoin])] : eastJoin,
    finishFor: marchonFinishes(context.buildings),
  });
  grantLighting(area.board.material, grantNight, zero);
  let freight: ReturnType<typeof kingFreight>;
  try { freight = yield* kingFreightSteps(context, grid, area); }
  catch (error) { area.dispose(); throw error; }
  const streetHeight = cityRoadHeight(context, area.groundAt);
  const roadHeight: typeof streetHeight = (x,z,road) =>
    road.tunnel && road.name === grantTunnel?.name && z >= 488.14 && z <= 527.43
      ? area.groundAt(x,z) : streetHeight(x,z,road);
  return {
    ...area,
    connectorBoard: { city: context, roadHeight },
    setNight(factor: number) { grantNight.value = factor; area.setNight(factor); freight.setNight?.(factor); },
    dispose() { freight.dispose(); area.dispose(); },
  };
  }
  // An abandoned build still runs to its end; the caller then disposes what it returns.
  const built = budget ? await runBudgeted(build(), { budgetMs: budget, stats: sliceStats }) : runSync(build());
  built.commitTrees();
  return built;
}

/**
 * The CSX Atlanta Terminal Subdivision (the Georgia Railroad corridor) and its Hulsey
 * Yard leads across the board, from the archived OSM fixture (king_memorial_rail.py):
 * two main tracks and the yard tracks that continue downtown's six at x = 1000. The
 * board's context carries no rail, so without this City drew no freight east of the
 * downtown edge. Ground ballast like the rest, with graded cuttings carved under it.
 */
export function kingFreight(context: TerrainCity, grid: GroundGrid, area: ReturnType<typeof createDowntownTerrain>) {
  return runSync(kingFreightSteps(context, grid, area));
}
/** kingFreight as a build that yields while it lays the track and carves its cuttings. */
function* kingFreightSteps(context: TerrainCity, grid: GroundGrid, area: ReturnType<typeof createDowntownTerrain>): Build<ReturnType<typeof createSurfaceTransport>> {
  const freightGround = Object.assign((x:number,z:number,run?:TransportRun) => {
    const y=area.groundAt(x,z);
    return run && y!==null ? grantFormation(x,y,grid.manifest.vertical.sceneZeroNavd88M) : y;
  }, {triangles:area.groundAt.triangles});
  const transport = yield* buildSurfaceTransport({ ...context, terrainTransport: { version: 1, roads: [], rail } }, grid, freightGround);
  yield* area.carveSteps(transport.cutting);
  area.group.add(transport.group);
  return transport;
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
