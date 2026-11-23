import { midtownFoundations } from '../city/midtown-foundations';
import { seventeenthAccess } from '../city/seventeenth-street';
import { neighborhoodTrees, type NeighborhoodCanopy } from '../city/neighborhood-trees';
import railRows from '../city/fixtures/midtown-rail.json';
import rowBounds from '../../../pipeline/prototypes/square-board/midtown-rows.json';
import type { ConnectorBoard } from '../city/connector-traffic';
import { cityRoadHeight } from '../city/road-height';
import { northConnectorGround, northConnectorTransport } from './connector-ground';
import { auburnTransport } from '../city/sweet-auburn-transport';
import { southConnectorTransport } from './south-connector-decks';
import { eastBounds, northBounds } from '../city/board-footprint';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import type { JoiningEdge, TerrainQuality } from '../terrain/surface';
import { createSurfaceTransport } from '../terrain/transport';
import type { TerrainCity, TransportRun } from '../terrain/transport-data';

export type Direction = 'north' | 'south';
export type Patch = `${Direction}-${'band' | 'corner'}`;
export type MidtownRow = keyof typeof rowBounds;
export const midtownRows = (Object.keys(rowBounds) as MidtownRow[]).sort((a, b) => rowBounds[b].maxZ - rowBounds[a].maxZ);
export type Section = Direction | MidtownRow;
export type Board = Patch | MidtownRow | 'downtown' | 'king' | 'auburn';
export type Area = ReturnType<typeof createDowntownTerrain>;
export type TrafficArea = Area & { connectorBoard: ConnectorBoard };
export const bounds: Record<Board, GroundManifest['bounds']> = {
  downtown: { minX: -1000, maxX: 1000, minZ: -1300, maxZ: 700 },
  king: eastBounds, auburn: northBounds,
  ...Object.fromEntries(midtownRows.map(id => [id, { minX: -1000, maxX: 1800, ...rowBounds[id] }])) as Record<MidtownRow, GroundManifest['bounds']>,
  'north-band': { minX: -1000, maxX: 1800, minZ: -1700, maxZ: -1300 },
  'north-corner': { minX: 1000, maxX: 1800, minZ: -1300, maxZ: -520 },
  'south-corner': { minX: 1000, maxX: 1800, minZ: 640, maxZ: 700 },
  'south-band': { minX: -1000, maxX: 1800, minZ: 700, maxZ: 1100 },
};

// Order preserves the existing City loaders' first two skirt indices.
const neighbors: Record<Board, Board[]> = {
  downtown: ['king', 'auburn', 'north-band', 'north-corner', 'south-band', 'south-corner'],
  king: ['downtown', 'auburn', 'south-corner'],
  auburn: ['downtown', 'king', 'north-corner'],
  'north-band': ['downtown', 'north-corner', 'midtown-south'],
  ...Object.fromEntries(midtownRows.map((id, i) => [id, [midtownRows[i-1] ?? 'north-band', ...midtownRows.slice(i+1, i+2)]])) as Record<MidtownRow, Board[]>,
  'north-corner': ['north-band', 'downtown', 'auburn'],
  'south-band': ['downtown', 'south-corner'],
  'south-corner': ['south-band', 'downtown', 'king'],
};

export function seam(a: Board, b: Board): JoiningEdge {
  const p = bounds[a], q = bounds[b];
  const minX = Math.max(p.minX, q.minX), maxX = Math.min(p.maxX, q.maxX);
  const minZ = Math.max(p.minZ, q.minZ), maxZ = Math.min(p.maxZ, q.maxZ);
  if (minX === maxX && minZ < maxZ) return { x: minX, minZ, maxZ };
  if (minZ === maxZ && minX < maxX) return { z: minZ, minX, maxX };
  throw Error(`No shared edge between ${a} and ${b}`);
}

export const joins = (id: Board) => neighbors[id].map(n => seam(id, n));

export function verifySeam(a: GroundGrid, b: GroundGrid, edge: JoiningEdge) {
  const m = a.manifest, n = b.manifest, p = m.horizontal, q = n.horizontal;
  if (!p || !q || p.originLon !== q.originLon || p.originLat !== q.originLat || p.radiusM !== q.radiusM ||
    m.stepM !== 5 || n.stepM !== 5 || m.vertical.sceneZeroNavd88M !== n.vertical.sceneZeroNavd88M)
    throw Error('Square-board registration differs');
  const vertical = 'x' in edge;
  for (let t = vertical ? edge.minZ : edge.minX; t <= (vertical ? edge.maxZ : edge.maxX); t += 5) {
    const x = vertical ? edge.x : t, z = vertical ? t : edge.z;
    const h = a.sample(x, z);
    if (h === null || h !== b.sample(x, z)) throw Error(`Square-board seam differs at ${x},${z}`);
  }
}

// Validate the entire addition before hiding any skirts on the mounted board.
export function connect(mounted: Map<Board, Area>, additions: Map<Board, Area>) {
  const all = new Map([...mounted, ...additions]);
  for (const [id, area] of additions) {
    for (const other of neighbors[id]) {
      const adjacent = all.get(other);
      if (adjacent) verifySeam(area.grid, adjacent.grid, seam(id, other));
    }
  }
  for (const [id, area] of additions) {
    mounted.set(id, area);
    neighbors[id].forEach((other, i) => {
      const adjacent = all.get(other);
      if (adjacent) { area.openJoin(i); adjacent.openJoin(neighbors[other].indexOf(id)); }
    });
  }
}

export async function response(url: string, signal: AbortSignal) {
  const r = await fetch(url, { signal });
  if (!r.ok) throw Error(`${url} (${r.status})`);
  return r;
}

export type BrookwoodGrid = (manifest: GroundManifest, bytes: ArrayBuffer) => Promise<GroundGrid>;

export async function gridAt(path: string, signal: AbortSignal, northBand = false, brookwood?: BrookwoodGrid) {
  const [manifest, bytes]: [GroundManifest, ArrayBuffer] = await Promise.all([
    response(path + '/ground.json', signal).then(r => r.json()),
    response(path + '/ground.i16', signal).then(r => r.arrayBuffer()),
  ]);
  if (manifest.scaleM !== 0.1 || manifest.offsetM !== 0 || manifest.noData !== -32768)
    throw Error('Incompatible elevation units or mask at ' + path);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  if (Array.from(digest, b => b.toString(16).padStart(2, '0')).join('') !== manifest.sha256)
    throw Error('Ground checksum mismatch at ' + path);
  if (brookwood) return brookwood(manifest, bytes);
  return northBand ? northConnectorGround(manifest, bytes) : new GroundGrid(manifest, bytes);
}

async function readPatch(id: Patch | MidtownRow, signal: AbortSignal, dataRoot = '/data', brookwood?: BrookwoodGrid) {
  const path = dataRoot + '/scene/square-board/' + id;
  const [grid, context]: [GroundGrid, TerrainCity & NeighborhoodCanopy & { name: string }] = await Promise.all([
    gridAt(path, signal, id === 'north-band', id === 'brookwood-station' || id === 'brookwood-south' ? brookwood : undefined), response(path + '/context.json', signal).then(r => r.json()),
  ]);
  if (context.name !== id || !Array.isArray(context.trees) || Object.entries(bounds[id]).some(([k, v]) =>
    grid.manifest.bounds[k as keyof typeof context.bounds] !== v || context.bounds?.[k as keyof typeof context.bounds] !== v) || !context.roads.length || !context.buildings.length)
    throw Error('Wrong or incomplete square-board patch ' + id);
  return { id, grid, context: id in rowBounds || id === 'north-band' ? midtownFoundations(context, grid.manifest.vertical.sceneZeroNavd88M) : context };
}

export async function addSection(direction: Section, mounted: Map<Board, Area>, quality: TerrainQuality, signal: AbortSignal, options?: { northBuilding?: string; dataRoot?: string; brookwood?: BrookwoodGrid }) {
  const square = direction === 'north' || direction === 'south';
  if (!square && !mounted.has(neighbors[direction][0])) throw Error(direction + ' requires ' + neighbors[direction][0]);
  const ids: (Patch | MidtownRow)[] = square ? [`${direction}-band`, `${direction}-corner`] : [direction];
  const patches = await Promise.all(ids.map(id => readPatch(id, signal, options?.dataRoot, options?.brookwood)));
  signal.throwIfAborted();
  const added = new Map<Board, TrafficArea>();
  try {
    for (const { id, grid, context } of patches) {
      if (!context.terrainTransport && Object.hasOwn(railRows, id)) {
        context.terrainTransport = { version: 1, roads: [], rail: railRows[id as MidtownRow] as TransportRun[] };
      }
      const city = id === 'north-band' ? northConnectorTransport(context) :
        id === 'south-band' ? southConnectorTransport(context) :
        id === 'brookwood-south' || id === 'midtown-upper' ? seventeenthAccess(auburnTransport(context)) : auburnTransport(context);
      const area = createDowntownTerrain(grid, city, neighborhoodTrees(context, quality), {
        quality, simpleLeafClumps: context.treeLowCount !== undefined,
        bottomY: mounted.get('downtown')!.bottomY, join: joins(id),
        separateBuilding: id === 'brookwood-station' ? 'osm:way:265350477' : id === 'north-band' ? options?.northBuilding : undefined,
      });
      const transports: ReturnType<typeof createSurfaceTransport>[] = [];
      try {
        const stationRoad = id === 'brookwood-station' && city.roads.find(road => road.id === 'osm:way:38978515');
        const data = city.terrainTransport!;
        const separate = stationRoad ? data.roads.filter(run => run.pts === stationRoad.pts) : [];
        const base = separate.length ? { ...city, terrainTransport: { ...data, roads: data.roads.filter(run => !separate.includes(run)) } } : city;
        const decks = createSurfaceTransport(base, grid, area.groundAt);
        transports.push(decks);
        area.group.add(decks.group);
        if (stationRoad && separate.length) {
          const stationDeck = createSurfaceTransport({ ...city, roads: [stationRoad], terrainTransport: { version: 1, roads: separate, rail: [] } }, grid, area.groundAt);
          transports.push(stationDeck);
          stationDeck.group.name = stationRoad.id!;
          area.group.add(stationDeck.group);
        }
        const deckHeight: typeof decks.deckAt = (x, z, run) =>
          decks.deckAt(x, z, run) ?? transports[1]?.deckAt(x, z, run) ?? null;
        added.set(id, {
          ...area,
          setNight(factor: number) { area.setNight(factor); decks.setNight?.(factor); },
          connectorBoard: { city, roadHeight: cityRoadHeight(city, area.groundAt, deckHeight) },
          dispose() { for (const t of transports) t.dispose(); area.dispose(); },
        });
      } catch (error) { for (const t of transports) t.dispose(); area.dispose(); throw error; }
    }
    connect(mounted, added);
    return added;
  } catch (error) {
    for (const area of added.values()) area.dispose();
    throw error;
  }
}
