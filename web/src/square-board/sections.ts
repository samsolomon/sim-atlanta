import { eastLandingYields } from '../../../pipeline/prototypes/highway-four-ground/landing';
import { eastHighwayApproaches, eastLandingTriangles } from '../../../pipeline/prototypes/highway-four/east';
import { golfFlags, teeMarkers } from '../terrain/golf';
import { northeastTrailStudy } from '../city/northeast-trail-study';
import { eastPortalBank } from '../../../pipeline/prototypes/i85-openings/rear-bank';
import { matchRibbon } from '../terrain/connector-corridor';
import { rampStudySteps } from '../city/i85-ramp-study';
import { northFreeway } from '../../../pipeline/prototypes/north-freeway/carrier';
import { sharedIds, joinedPaint } from '../city/north-seam-neighborhood';
import { mountNorthRowSteps, type NorthRowMount } from '../city/north-row-mount';
import { underpassFloor, underpassGround } from '../terrain/underpass';
import { northAvenue } from '../terrain/north-ave';
import { midtownConnectorGround } from '../terrain/midtown-connector-ground';
import { midtownConnectorDecks, withoutLandBridgeTrees } from '../terrain/midtown-connector-decks';
import { midtownConnectorPiers } from '../terrain/midtown-connector-piers';
import { seventeenthAccess } from '../city/seventeenth-street';
import { neighborhoodTrees, type NeighborhoodCanopy } from '../city/neighborhood-trees';
import { loadPlaces, placeAt, sceneToLonLat } from '../core/places';

/** Five Points, the pipeline origin (main.ts CITY_ORIGIN). */
const ORIGIN = { lon: -84.3916, lat: 33.7539 };
const inAnsley = (x: number, z: number) => placeAt(...sceneToLonLat(ORIGIN, x, z)) === 'Ansley Park';
import railRows from '../city/fixtures/midtown-rail.json';
import { brookwoodCorridorRail } from '../city/brookwood-corridor';
import { midtownLights } from '../city/midtown-night';
import { northLineRail } from '../city/midtown-marta-guideway';
import { northLinePortalSlots } from '../city/midtown-marta-rail';
import trackedRows from '../../../pipeline/prototypes/square-board/midtown-rows.json';
import type { ConnectorBoard } from '../city/connector-traffic';
import { cityRoadHeight } from '../city/road-height';
import { northConnectorGround, northConnectorTransport } from './connector-ground';
import { auburnTransport } from '../city/sweet-auburn-transport';
import { southConnectorTransport } from './south-connector-decks';
import { eastBounds, northBounds } from '../city/board-footprint';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { buildDowntownTerrain, createDowntownTerrain, FAR_GROUND_ERROR_M, FAR_GROUND_SETTLED, terrainOpenings } from '../terrain/model';
import { runBudgeted, runSync, sliceBudget, sliceInput, sectionWorkMs, sliceStats, type Build } from '../core/slice';
import { GroundSurface } from '../terrain/surface';
import { BAKED_AREAS, bakeFile, bakeOff, BakeReplay, bakeStats, decodeBake, type BakedGround, type BakeRecorder } from '../terrain/ground-bake';
import { prebuildSurface } from '../terrain/surface-prebuild';

/**
 * ?worker=1 builds ground surfaces in a Worker (the sliced-build work; off by default).
 * The +13 MB it used to add on low was the prebuilt near arrays kept reachable after a deck
 * carve replaced them (fixed: takeSurface); heap after GC now matches the main-thread path.
 */
function surfaceWorker() { return typeof location !== 'undefined' && new URLSearchParams(location.search).get('worker') === '1'; }
import type { JoiningEdge, TerrainQuality } from '../terrain/surface';
import { piedmontCampusMassing, piedmontNorthLink } from '../city/piedmont-campus';
import { shepherdCampusMassing } from '../city/shepherd-center';
import { buildSurfaceTransport, type createSurfaceTransport } from '../terrain/transport';
import type { TerrainCity, TransportRun } from '../terrain/transport-data';

export type Direction = 'north' | 'south';
export type Patch = `${Direction}-${'band' | 'corner'}`;
const rowBounds = { ...trackedRows, r16: { minZ: -6500, maxZ: -5700 } };
export type MidtownRow = keyof typeof rowBounds;
export const midtownRows = (Object.keys(rowBounds) as MidtownRow[]).sort((a, b) => rowBounds[b].maxZ - rowBounds[a].maxZ);
export type Section = Direction | MidtownRow;
export type Board = Patch | MidtownRow | 'downtown' | 'king' | 'auburn';
export type Area = ReturnType<typeof createDowntownTerrain>;
export type TrafficArea = Area & { connectorBoard: ConnectorBoard; orbitGround?: (x:number,z:number)=>number|null; northTread?: (x:number,z:number)=>number|null; northMount?: NorthRowMount };
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

function verifyAddition(mounted: Map<Board, Area>, additions: Map<Board, Area>) {
  const all = new Map([...mounted, ...additions]);
  for (const [id, area] of additions) {
    for (const other of neighbors[id]) {
      const adjacent = all.get(other);
      if (adjacent) verifySeam(area.grid, adjacent.grid, seam(id, other));
    }
  }
  return all;
}

// Validate the entire addition before hiding any skirts on the mounted board.
export function connect(mounted: Map<Board, Area>, additions: Map<Board, Area>) {
  const all = verifyAddition(mounted, additions);
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
  const terrain = midtownConnectorGround(manifest, bytes);
  if (brookwood) return brookwood(manifest, terrain);
  if (northBand) return northConnectorGround(manifest, bytes);
  if (path.endsWith('/midtown-south')) underpassGround(northAvenue, manifest, terrain);
  return new GroundGrid(manifest, terrain);
}

async function readPatch(id: Patch | MidtownRow, quality: TerrainQuality, signal: AbortSignal, budget: ((restMs: number) => number) | null, dataRoot = '/data', brookwood?: BrookwoodGrid) {
  const path = dataRoot + '/scene/square-board/' + id;
  const [grid, context]: [GroundGrid, TerrainCity & NeighborhoodCanopy & { name: string }] = await Promise.all([
    gridAt(path, signal, id === 'north-band', id === 'r16' || id === 'brookwood-station' || id === 'brookwood-south' ? brookwood : undefined), response(path + '/context.json', signal).then(r => r.json()),
  ]);
  if (context.name !== id || !Array.isArray(context.trees) || Object.entries(bounds[id]).some(([k, v]) =>
    grid.manifest.bounds[k as keyof typeof context.bounds] !== v || context.bounds?.[k as keyof typeof context.bounds] !== v) || !context.roads.length || !context.buildings.length)
    throw Error('Wrong or incomplete square-board patch ' + id);
  const baked = await readBake(path, id, quality, grid, signal);
  const study = id === 'r16' ? rampStudySteps(grid, quality, joins(id)) : undefined;
  const ramp = study && (budget ? await runBudgeted(study, { budgetMs: budget, stats: sliceStats }) : runSync(study));
  // The orbit and the lower road still use the original exposed surface.
  const drawnGrid=ramp ? eastPortalBank(grid) : grid;
  const trail = ramp && northeastTrailStudy(grid.manifest.bounds, ramp.originalHeight);
  const slots = ramp && [...ramp.slots, ...(trail?.slots ?? [])];
  return { id, grid:drawnGrid, context, ramp, trail, slots, baked };
}

/**
 * The area's baked ground (terrain/ground-bake.ts), when it has one for this grid and tier, or
 * null: missing, unreadable or stale bakes count as fallbacks and the area builds as before.
 */
async function readBake(path: string, id: string, quality: TerrainQuality, grid: GroundGrid, signal: AbortSignal): Promise<BakedGround | null> {
  if (!BAKED_AREAS.has(id) || bakeOff || surfaceWorker()) return null;
  const miss = (why: string) => { bakeStats.fallbacks++; bakeStats.reasons.push(`${id} ${quality}: ${why}`); return null; };
  let r: Response;
  try { r = await fetch(`${path}/${bakeFile(quality)}`, { signal }); } catch (e) { if (signal.aborted) throw e; return miss('bake not fetched'); }
  if (!r.ok) return miss(`bake ${r.status}`);
  const baked = decodeBake(await r.arrayBuffer());
  if (!baked) return miss('bake unreadable');
  if (baked.id !== id || baked.quality !== quality || baked.gridSha256 !== grid.manifest.sha256) return miss('bake for another grid');
  return baked;
}

/** Work a page adds to a row's build, as its last steps before the row connects to the board. */
export type PrepareRow = (id: Board, area: TrafficArea) => Build<void> | undefined;

export async function addSection(direction: Section, mounted: Map<Board, Area>, quality: TerrainQuality, signal: AbortSignal, options?: { northBuilding?: string; dataRoot?: string; brookwood?: BrookwoodGrid; prepare?: PrepareRow;
  /** The bake script: record this row's ground (terrain/ground-bake.ts) instead of replaying a bake. */
  record?: (id: Board) => BakeRecorder | undefined }) {
  const square = direction === 'north' || direction === 'south';
  if (!square && !mounted.has(neighbors[direction][0])) throw Error(direction + ' requires ' + neighbors[direction][0]);
  const ids: (Patch | MidtownRow)[] = square ? [`${direction}-band`, `${direction}-corner`] : [direction];
  const budget = sliceBudget();
  const [patches] = await Promise.all([
    Promise.all(ids.map(id => readPatch(id, quality, signal, budget, options?.dataRoot, options?.brookwood))),
    // Neighbourhood outlines, for the rollout's Ansley Park rules (failures leave them off).
    Promise.resolve().then(() => loadPlaces((options?.dataRoot ?? '/data') + '/ga/neighborhoods.json')).catch(() => undefined),
  ]);
  signal.throwIfAborted();
  // ?worker=1: every patch's ground surface is built in a Worker, in parallel, before the
  // synchronous area build, which then adopts it. Same triangles (terrain/surface.test.ts).
  const surfaces = surfaceWorker() ? await Promise.all(patches.map(({ id, grid, slots }) => prebuildSurface(grid, quality,
    terrainOpenings(grid, { extraSlots: slots, underpass: id === 'midtown-south' ? northAvenue : undefined, openings: id === 'brookwood-station' ? northLinePortalSlots(grid) : undefined }),
    joins(id), quality === 'low' && GroundSurface.farLow ? FAR_GROUND_ERROR_M : undefined, FAR_GROUND_SETTLED))) : undefined;
  signal.throwIfAborted();
  // Hand each prebuilt surface over once and drop it here: the area's closures keep this scope
  // alive, and a deck carve replaces the near arrays, which must not stay reachable (+13 MB on
  // low, all typed-array stores, in a heap snapshot diff).
  const takeSurface = (i: number) => { const s = surfaces?.[i]; if (surfaces) surfaces[i] = undefined as never; return s; };
  const added = new Map<Board, TrafficArea>();
  // One build, two drivers: a few ms per frame, or straight through under ?slice=0 and in Node.
  function* buildPatches(): Build<Map<Board, TrafficArea>> {
  try {
    for (const [patchIndex, { id, grid, context, ramp, trail, slots, baked }] of patches.entries()) {
      if (!context.terrainTransport && Object.hasOwn(railRows, id)) {
        context.terrainTransport = { version: 1, roads: [], rail: northLineRail(id, brookwoodCorridorRail(railRows[id as keyof typeof railRows] as TransportRun[], grid)) };
      }
      const contextWithDecks = id === 'north-band' ? northConnectorTransport(context) :
        id === 'south-band' ? southConnectorTransport(context) :
        id === 'brookwood-south' || id === 'midtown-upper' ? seventeenthAccess(auburnTransport(context)) : auburnTransport(context);
      const freeway = id in rowBounds ? northFreeway(midtownConnectorDecks(contextWithDecks)) : contextWithDecks;
      const city = id === "r16" ? eastHighwayApproaches(freeway) : freeway;
      const canopy = id in rowBounds ? withoutLandBridgeTrees(context) : context;
      const edgeRow = (id === 'r16' || id === 'brookwood-station') ? id : undefined;
      const rowBuildings = id === 'r16' ? shepherdCampusMassing(piedmontCampusMassing(city.buildings)) : city.buildings;
      const scenery = edgeRow ? {...city, buildings: rowBuildings.filter(b => !sharedIds.has(b.id))} : city;
      const area = yield* buildDowntownTerrain(grid, scenery, neighborhoodTrees(canopy, quality), {
        boardRoads: edgeRow ? joinedPaint(edgeRow, city) : undefined,
        quality, simpleLeafClumps: context.treeLowCount !== undefined,
        bottomY: mounted.get('downtown')!.bottomY, join: joins(id),
        separateBuilding: id === 'brookwood-station' ? 'osm:way:265350477' : id === 'north-band' ? options?.northBuilding : undefined,
        lights: id in rowBounds ? midtownLights : undefined,
        underpass: id === 'midtown-south' ? northAvenue : undefined,
        openings: id === 'brookwood-station' ? northLinePortalSlots(grid) : undefined,
        extraSlots: slots,
        // The tree rollout on canopy-map rows: planned from the row's full crown list.
        rollout: canopy.treeLowCount !== undefined ? { row: id, lowCount: canopy.treeLowCount, allCrowns: canopy.trees, inAnsley } : undefined,
        surface: takeSurface(patchIndex),
        bake: (rec => rec ? { record: rec } : baked ? { replay: new BakeReplay(baked) } : undefined)(options?.record?.(id)),
        // Trees join the City-wide batch only when the whole section mounts.
        deferTrees: true,
        // Sliced: dress the trees for today now, not in one pass when the section mounts.
        dayOfYear: budget ? sliceInput.dayOfYear : undefined,
      });
      const flags = golfFlags(city.points?.golfFlags,area.terrainAt);
      if (flags) area.board.add(flags);
      const markers = teeMarkers(city.points?.golfMarkers,area.terrainAt);
      if (markers) area.board.add(markers);
      const transports: ReturnType<typeof createSurfaceTransport>[] = [];
      const data = city.terrainTransport!;
      const hospitalLink = id === 'r16' ? piedmontNorthLink(rowBuildings, data.roads, area.groundAt) : null;
      try {
        const stationRoad = id === 'brookwood-station' && city.roads.find(road => road.id === 'osm:way:38978515');
        const separate = stationRoad ? data.roads.filter(run => run.pts === stationRoad.pts) : [];
        const base = separate.length || hospitalLink
          ? { ...city, terrainTransport: { ...data, roads: data.roads.filter(run => !separate.includes(run) && run !== hospitalLink?.run) } }
          : city;
        const decks = yield* buildSurfaceTransport(base, grid, area.groundAt);
        if (id === 'r16') decks.cutting.push(...eastLandingYields(eastLandingTriangles(city)));
        transports.push(decks);
        yield* area.carveSteps(trail ? [...decks.cutting, ...trail.yields] : decks.cutting);
        area.group.add(decks.group);
        if (hospitalLink) area.group.add(hospitalLink.mesh);
        yield 'decks';
        if (stationRoad && separate.length) {
          const stationDeck = yield* buildSurfaceTransport({ ...city, roads: [stationRoad], terrainTransport: { version: 1, roads: separate, rail: [] } }, grid, area.groundAt);
          transports.push(stationDeck);
          stationDeck.group.name = stationRoad.id!;
          area.group.add(stationDeck.group);
        }
        const deckHeight: typeof decks.deckAt = (x, z, run) =>
          decks.deckAt(x, z, run) ?? transports[1]?.deckAt(x, z, run) ?? null;
        const nbWays = new Set([28038801, 1416312985, 484857197, 369529900]);
        const nbRuns = id === 'r16' || id === 'brookwood-station' ? data.roads.filter(run => {
          const axis = run.sourceAxis ?? run.pts;
          return axis.length > 1 && run.cls === 'motorway' && nbWays.has(matchRibbon(axis[0],axis[1],false)?.id ?? -1);
        }) : [];
        const northTread = (x:number,z:number) => {
          for (const run of nbRuns) {
            const y = deckHeight(x,z,run);
            if (y !== null) return y;
          }
          return null;
        };
        const piers = id in rowBounds ? midtownConnectorPiers(city, area.groundAt, deckHeight) : undefined;
        if (piers) area.group.add(piers.mesh);
        if (ramp) area.group.add(ramp.surface, ramp.lining);
        if (trail) area.group.add(trail.mountTread(area.terrainAt), trail.lining);
        const stockRoadHeight = cityRoadHeight(city, area.groundAt, deckHeight);
        if (ramp) for (const road of city.roads) {
          if (road.cls === 'motorway' && road.sub === 'link') ramp.register(road.pts);
        }
        const roadHeight: typeof stockRoadHeight = ramp
          ? (x,z,road) => ramp.roadHeight(x,z,road.pts) ?? stockRoadHeight(x,z,road) : stockRoadHeight;
        yield 'piers and road heights';
        added.set(id, {
          ...area, northTread, orbitGround: ramp?.originalHeight,
          setNight(factor: number) { area.setNight(factor); decks.setNight?.(factor); },
          connectorBoard: { city, roadHeight: id !== 'midtown-south' ? roadHeight : (x, z, road) => {
            if (road.name === northAvenue.roadName) {
              const [s, t] = northAvenue.local(x, z);
              if (s >= northAvenue.start && s <= northAvenue.end && Math.abs(t) <= northAvenue.halfWidth)
                return underpassFloor(northAvenue, s, t, area.terrainAt, grid.manifest.vertical.sceneZeroNavd88M);
            }
            return roadHeight(x, z, road);
          } },
          dispose() {
            for (const detail of [flags, markers]) {
              detail?.geometry.dispose();
              detail?.material.dispose();
            }
            hospitalLink?.dispose();
            for (const t of transports) t.dispose();
            piers?.mesh.geometry.dispose();
            (piers?.mesh.material as { dispose(): void } | undefined)?.dispose();
            trail?.dispose();
            ramp?.dispose();
            area.dispose();
          },
        });
      } catch (error) { hospitalLink?.dispose(); for (const t of transports) t.dispose(); area.dispose(); throw error; }
      const own = options?.prepare?.(id, added.get(id)!);
      if (own) yield* own;
    }
    return added;
  } catch (error) {
    for (const area of added.values()) area.dispose();
    throw error;
  }
  }
  // A sliced build that is abandoned still runs to completion in the background and is then
  // disposed: nothing half-built is registered or left behind (the area is not in the scene).
  if (direction === 'r16') performance.mark('r16:build-start');
  const workBefore = sliceStats.totalMs;
  const built = budget ? await runBudgeted(buildPatches(), { budgetMs: budget, stats: sliceStats }) : runSync(buildPatches());
  if (budget) sectionWorkMs[direction] = Math.round(sliceStats.totalMs - workBefore);
  // A replayed bake that the mount left stale (fewer carves than baked) builds its ground now.
  for (const area of built.values()) area.groundSurface.endBake();
  const north = built.get('r16'), station = mounted.get('brookwood-station') as TrafficArea | undefined;
  try {
    signal.throwIfAborted();
    if (north && station) {
      // R16's mount work also cuts the Station, so the seam is proved first.
      verifyAddition(mounted, built);
      const mount = mountNorthRowSteps(north, station, quality);
      north.northMount = budget ? await runBudgeted(mount, { budgetMs: budget, stats: sliceStats }) : runSync(mount);
      signal.throwIfAborted();
    }
    connect(mounted, built);
  } catch (error) {
    // Aborted, or a seam failed validation: nothing of this section survives.
    north?.northMount?.disposeBuildings();
    for (const area of built.values()) area.dispose();
    throw error;
  }
  north?.northMount?.commit();
  for (const area of built.values()) area.commitTrees();
  if (direction === 'r16') performance.mark('r16:built');
  return built;
}
