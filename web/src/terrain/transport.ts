import { drawClaraMeerBridge } from '../city/clara-meer';
import { drawKendedaWalk } from '../city/kendeda-walk';
import { triangleHeight } from './tread-height';
import { DECK_GRADE, DECK_REACH, solveDeckLevels } from './deck-levels';
import { bedFlags, cuttingYields, type BallastQuad } from './cutting';
import { drapeTriangle, type DrapeGround } from './drape';
import type { GroundYield } from './surface';
import { drawJunctionDecks } from './junction-decks';
import { colourDrop, orderForFar, registerFar } from './far-form';
import * as THREE from 'three';
import { runSync, type Build } from '../core/slice';
import { Builder, Line, segDist, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';
import { alongOn, matchRibbon, sectionAt, stripePoint } from './connector-corridor';
import { PAL } from '../vignette/world';
import type { GroundGrid } from './grid';
import { roadWidth, type TerrainCity, type TransportRun } from './transport-data';
import { connectorMedians, inConnectorLanes } from './connector-paint';
import { drawSeventeenthStreet } from '../city/seventeenth-street';
import { drawStreetBridges } from './street-bridges';
import { pathConcrete, pathWidth, westsidePaths } from './westside-path';

type GroundAt = (x: number, z: number, run?: TransportRun) => number | null;
const WALKS = new Set(['footway', 'pedestrian', 'steps', 'path', 'cycleway']);
/** Half the swept width of a train on a surface track: a 3.2 m car, curve overhang, a margin. */
export const RAIL_ENVELOPE_M = 1.8;
/** Height an inferred deck keeps above a surface track (about 23 ft); the deck adds 1 m. */
const RAIL_CLEARANCE_M = 7;
/** A sidewalk this far beyond its road deck's edge, within 30° of parallel, rides the deck. */
const WELD_REACH_M = 6;
const WELD_PARALLEL = Math.cos(Math.PI / 6);
/** A flight of steps drawn where a raised walk meets mapped steps: rise, going and rail height. */
const STAIR_RISE_M = .17, STAIR_GOING_M = .3, STAIR_RAIL_M = 1;
/** A walk beside a road deck for at least this share of its length is that road's sidewalk. */
const SIDEWALK_SHARE = .6;

export interface FreightTreadPoint {
  s: number;
  position: THREE.Vector3;
}
export interface SurfaceTransport {
  freightTreads: FreightTreadPoint[][];
  /** Scene y on the specified road deck, or null outside its visible tread. */
  deckAt(x: number, z: number, run: TransportRun): number | null;
  clearOfFreight(x: number, z: number): boolean;
  /** Graded cuttings for ground ballast the terrain stands over. Carve the board with them
   * (`area.carve`) once the transport is built: they only lower the terrain. */
  cutting: GroundYield[];
  group: THREE.Group;
  setNight?(factor: number): void;
  structuralTier: 'illustrative';
  dispose(): void;
}

// One texture period is 0.8 scene metres along track, and 4.2 metres across.
// Keeping the sleepers and steel in the tread avoids a box draw for each sleeper.
function freightTexture() {
  const w = 128, h = 16;
  const bytes = new Uint8Array(w * h * 4);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const d = Math.abs(((col + 0.5) / w - 0.5) * 4.2);
      const rail = Math.abs(d - 0.7175) < 0.075;
      const sleeper = d < 1.35 && row < 5;
      const color = rail ? [166, 155, 140] : sleeper ? [82, 63, 51] : [126, 115, 99];
      bytes.set([...color, 255], (row * w + col) * 4);
    }
  }
  const map = new THREE.DataTexture(bytes, w, h);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = 4;
  map.needsUpdate = true;
  return map;
}

/** Attach beside the terrain group. All heights use the board's shared scene zero. */
export function createSurfaceTransport(city: TerrainCity, grid: GroundGrid, terrainGround: GroundAt,
  cut?: { freight: TransportRun; treadY: number }): SurfaceTransport {
  return runSync(buildSurfaceTransport(city, grid, terrainGround, cut));
}

/**
 * createSurfaceTransport as a build that yields between runs (core/slice.ts). Runs draw into the
 * shared builders in the same order either way, so the geometry, vertex order and far prefix are
 * identical (terrain/sliced-build.test.ts fingerprints them).
 */
export function* buildSurfaceTransport(city: TerrainCity, grid: GroundGrid, terrainGround: GroundAt,
  cut?: { freight: TransportRun; treadY: number }): Build<SurfaceTransport> {
  const data = city.terrainTransport;
  if (data?.version !== 1) throw new Error('Missing scoped terrain transport. Run pnpm data:city.');
  const group = new THREE.Group();
  group.name = 'Surface transport';
  group.userData.structuralHeightTier = 'illustrative';
  const structures = new Builder(), freight = new Builder(), uv: number[] = [];
  // Structure triangles the far form skips (far-form.ts): deck undersides, parapet tops and
  // inner faces. Lane markings are matched by colour when the mesh is built.
  const farDrop = new Set<number>();
  const dropNext = (quads: number) => { const t = structures.pos.length / 9; for (let i = 0; i < 2 * quads; i++) farDrop.add(t + i); };
  const bounds = city.bounds;
  const sceneZero = grid.manifest.vertical.sceneZeroNavd88M;
  const sidepaths = westsidePaths(city);
  const freightTreads: FreightTreadPoint[][] = [];
  const footbridgeYields: GroundYield[] = [];
  const ballastRuns: BallastQuad[][] = [];
  // Carve never moves a board's edge cells, so cuttings are clipped to this inset.
  const carvable = { minX: bounds.minX + grid.manifest.stepM + .01, maxX: bounds.maxX - grid.manifest.stepM - .01,
    minZ: bounds.minZ + grid.manifest.stepM + .01, maxZ: bounds.maxZ - grid.manifest.stepM - .01 };
  const inCarvable = (q: BallastQuad) => q.every(([x, , z]) => x >= carvable.minX && x <= carvable.maxX && z >= carvable.minZ && z <= carvable.maxZ);
  // Offsets into the single rendered structural mesh, grouped by source road.
  const roadTreads = new Map<TransportRun, number[]>();
  // Audit-only intent: a folded corner can wind a slab underside upward.
  const buriedFaces = import.meta.env.DEV ? new Set<number>() : undefined;
  const seventeenth = new Builder(), bridgeRuns = new Set<TransportRun>();
  let bridgePositions: THREE.BufferAttribute;
  let structurePositions: THREE.BufferAttribute;
  function deckAt(x: number, z: number, run: TransportRun) {
    const halfWidth = junctionWidths.get(run);
    if (halfWidth !== undefined && !run.pts.some((p, i) =>
      i > 0 && segDist(x, z, run.pts[i - 1], p) <= halfWidth + .1)) return null;
    const quads = roadTreads.get(run);
    if (quads) for (const i of quads) {
      const h = triangleHeight(bridgeRuns.has(run) ? bridgePositions : structurePositions, i, x, z);
      if (h !== null) return h;
    }
    return null;
  }
  // A 3.2 m locomotive, the 2.2 × 2.6 m column on its diagonal and a small margin.
  const pierClearanceM = 3.8;
  const freightSegments = new PlacementIndex<[P2, P2]>();
  for (const run of data.rail) {
    if (run.cls !== 'standard_gauge') continue;
    for (let i = 1; i < run.pts.length; i++) {
      const segment: [P2, P2] = [run.pts[i - 1], run.pts[i]];
      freightSegments.add(segment, segment, pierClearanceM);
    }
  }
  const clearOfFreight = (x: number, z: number) =>
    freightSegments.at(x, z).every(([a, b]) => segDist(x, z, a, b) >= pierClearanceM);

  // West to east: intact rail approaches beyond Piedmont, between Jesse Hill and
  // the freeway, and east of the freeway. Bare earth inside the highway and the
  // Georgia State structures is several metres below the railway. The grade between
  // these bank proxies is schematic. Adjacent freight tracks share the embankment.
  const banks = [[444.07, 321.30], [647.51, 473.99], [866.02, 541.33]].map(([x, z]) =>
    ({ x, z, h: grid.sample(x, z) }));
  const gradeAvailable = data.rail.some(r => r.freightS) && banks.every(bank => bank.h !== null);
  function freightGrade(x: number, z: number, base: number) {
    if (!gradeAvailable || x <= banks[0].x || x >= banks[2].x) return base;
    const i = x < banks[1].x ? 0 : 1;
    const a = banks[i], b = banks[i + 1];
    const fraction = (x - a.x) / (b.x - a.x);
    // The other freight and passenger corridors retain their own structural profiles.
    if (Math.abs(z - (a.z + fraction * (b.z - a.z))) > 42) return base;
    const grade = a.h! + fraction * (b.h! - a.h!) - grid.manifest.vertical.sceneZeroNavd88M;
    const blend = Math.min(1, (x - banks[0].x) / 15, (banks[2].x - x) / 15);
    return base + blend * Math.max(0, grade - base);
  }

  // Nearby mapped surface routes constrain the inferred underside of an
  // unsurveyed deck. Parallel ways and continuations at its abutments do not.
  type Crossing = { a: P2; b: P2; radius: number; clearance: number };
  const crossings = new PlacementIndex<Crossing>();
  function indexCrossing(pts: P2[], radius: number, clearance: number) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      crossings.add({ a, b, radius, clearance }, [a, b], radius);
    }
  }
  const surfaceJunctions = new Set<string>();
  let indexed = 0;
  for (const road of city.roads) {
    if (++indexed % 64 === 0) yield 'transport index';
    if (road.bridge || road.tunnel || road.pts.length < 2) continue;
    surfaceJunctions.add(road.pts[0].join(','));
    surfaceJunctions.add(road.pts.at(-1)!.join(','));
    indexCrossing(road.pts, roadWidth(road) / 2,
      WALKS.has(road.cls) ? 2.5 : 5);
  }
  for (const rail of data.rail) if (rail.kind === 'ground') indexCrossing(rail.pts, 2.1, RAIL_CLEARANCE_M);
  // A train's swept half width (a 3.2 m car, its overhang on a curve and a margin). An inferred
  // deck whose footprint reaches it is held at rail clearance wherever the track runs under it,
  // not only where the centrelines cross: a viaduct can carry a track lengthways underneath.
  const railBeds = new PlacementIndex<[P2, P2]>();
  for (const rail of data.rail) if (rail.kind === 'ground' && rail.cls !== 'tram')
    for (let i = 1; i < rail.pts.length; i++) railBeds.add([rail.pts[i - 1], rail.pts[i]], [rail.pts[i - 1], rail.pts[i]], RAIL_ENVELOPE_M);
  // A viaduct's sidewalks are mapped as their own bridge ways. Each takes at least the height
  // of the road deck it runs beside, so it cannot drop to the ground between two crossings
  // while its road stays up. Filled once the road decks are drawn (walks draw after them).
  type Viaduct = { run: TransportRun; a: P2; b: P2; half: number };
  const viaducts = new PlacementIndex<Viaduct>();
  // The structures drawn so far, read in place: a deck that ends on another reads it as drawn.
  const livePositions = { getX: (i: number) => structures.pos[3 * i], getY: (i: number) => structures.pos[3 * i + 1],
    getZ: (i: number) => structures.pos[3 * i + 2] } as unknown as THREE.BufferAttribute;
  let viaductPositions: THREE.BufferAttribute | null = null;
  function viaductHeight(p: { x: number; z: number; dx: number; dz: number }) {
    if (!viaductPositions) return -Infinity;
    let best = -Infinity;
    for (const v of viaducts.at(p.x, p.z)) {
      const dx = v.b[0] - v.a[0], dz = v.b[1] - v.a[1], length = Math.hypot(dx, dz);
      if (!length || Math.abs((p.dx * dx + p.dz * dz) / length) < WELD_PARALLEL) continue;
      if (segDist(p.x, p.z, v.a, v.b) > v.half + WELD_REACH_M) continue;
      const t = THREE.MathUtils.clamp(((p.x - v.a[0]) * dx + (p.z - v.a[1]) * dz) / (length * length), 0, 1);
      const x = v.a[0] + t * dx, z = v.a[1] + t * dz;
      for (const i of roadTreads.get(v.run) ?? []) {
        const y = triangleHeight(viaductPositions, i, x, z);
        if (y !== null) { best = Math.max(best, y); break; }
      }
    }
    return best;
  }

  /** Top of a drawn road deck at a point, if one is under it. */
  function viaductTop(x: number, z: number) {
    if (!viaductPositions) return null;
    for (const v of viaducts.at(x, z)) {
      if (segDist(x, z, v.a, v.b) > v.half) continue;
      for (const i of roadTreads.get(v.run) ?? []) {
        const y = triangleHeight(viaductPositions, i, x, z);
        if (y !== null) return y;
      }
    }
    return null;
  }
  /** Road deck tops at their nodes, for the walks that end on them. */
  const deckNodes = new Map<string, number>();
  /** Bridge runs through each mapped vertex. */
  const vertexRuns = new Map<string, TransportRun[]>();
  for (const run of data.roads) if (run.kind === 'bridge') for (const p of run.pts) {
    const key = p.join(',');
    vertexRuns.set(key, [...(vertexRuns.get(key) ?? []), run]);
  }
  /** Top of another deck already drawn through this vertex, and whether it is a walk. */
  function drawnTopAt(p: P2, except: TransportRun) {
    for (const other of vertexRuns.get(p.join(',')) ?? []) {
      if (other === except) continue;
      for (const i of roadTreads.get(other) ?? []) {
        const y = triangleHeight(livePositions, i, p[0], p[1]);
        if (y !== null) return { y, walk: WALKS.has(other.cls) };
      }
    }
    return null;
  }
  // Filled by the deck-level solve below, before any bridge road draws. Only decks in a rail
  // cluster (connected through free nodes to a deck over a track) take the new rules; every
  // other deck draws exactly as before.
  let levels: Map<string, number> = new Map();
  let railCluster = new Set<TransportRun>();

  // Road deck runs by end point, for mitred joints between consecutive clustered decks (draw).
  const deckEnds = new Map<string, TransportRun[]>();
  for (const r of data.roads) if (r.kind === 'bridge' && r.pts.length > 1)
    for (const p of [r.pts[0], r.pts.at(-1)!]) deckEnds.set(p.join(','), [...(deckEnds.get(p.join(',')) ?? []), r]);
  function draw(run: TransportRun, use: 'road' | 'freight' | 'tram', owner = run) {
    if (run.pts.length < 2) return;
    // Only this matched freight strip shares the illustrative bed. Roads retain terrain support.
    const groundAt: GroundAt = cut && run === cut.freight ? () => cut.treadY - .13 : (x,z) => terrainGround(x,z,run);
    const line = new Line(run.pts);
    if (!line.length) return;
    const bridge = run.kind === 'bridge';
    const onEdge = ([x, z]: P2) => x === bounds.minX || x === bounds.maxX || z === bounds.minZ || z === bounds.maxZ;
    const start = run.pts[0], end = run.pts[run.pts.length - 1];
    const startCut = onEdge(start), endCut = onEdge(end);
    function support(p:P2) {
      if (use!=='road') return null;
      for(const parent of junctionNodes.get(p.join(',')) ?? []) {
        for(const i of roadTreads.get(parent) ?? []) {
          const y=triangleHeight(sharedPositions,i,...p);
          if(y!==null) return y-.12;
        }
      }
      return null;
    }
    const firstSupport=support(start),lastSupport=support(end);
    const elevation=(p:P2,height:number|null) => height===null ? grid.sample(...p) : height+grid.manifest.vertical.sceneZeroNavd88M;
    // A deck end on a solved level (deck-levels.ts) or on a drawn road deck keeps that height.
    const clustered = railCluster.has(owner);
    const level = (p: P2, height: number | null) => {
      if (height !== null || use !== 'road' || run.deckNavd88M || !clustered) return elevation(p, height);
      // A deck ending on one already drawn meets its tread: flush, or a kerb up from a roadway.
      const drawn = drawnTopAt(p, owner);
      if (drawn) return drawn.y - (WALKS.has(run.cls) && !drawn.walk ? 0 : .12) + sceneZero;
      const solved = levels.get(p.join(','));
      return solved !== undefined ? solved + sceneZero : elevation(p, height);
    };
    const startHeight = bridge && !startCut ? level(start,firstSupport) : null;
    // A solved end stands on its level across the whole width, not on the ground beside it.
    const startLevel = firstSupport === null && startHeight !== null && startHeight !== elevation(start, null) ? startHeight - sceneZero : null;
    // The short Midtown South building-to-sidewalk span crosses a DEM crease.
    const southFootbridge = bridge && use === 'road' && run.cls === 'footway' && !run.deckNavd88M &&
      [start, end].some(([x, z]) => Math.hypot(x - 371.18, z + 1870.12) < .05) &&
      [start, end].some(([x, z]) => Math.hypot(x - 360.93, z + 1870.15) < .05);
    const endHeight = bridge && !endCut ? level(end,lastSupport) : null;
    const endLevel = lastSupport === null && endHeight !== null && endHeight !== elevation(end, null) ? endHeight - sceneZero : null;
    const profile = run.deckNavd88M;
    if (bridge && !profile && ((startCut && endCut) || (!startCut && startHeight === null) || (!endCut && endHeight === null))) return;
    // A board cut can pass through mid-air. Carry the in-board support to that edge.
    const h0 = startHeight ?? endHeight, h1 = endHeight ?? startHeight;
    const sidepath = sidepaths.has(run);
    const ribbon = use === 'road' && run.cls === 'motorway'
      ? matchRibbon(run.pts[0],run.pts[1],run.sub==='link') : undefined;
    const travelWidth = ribbon ? ribbon.lanes*3.55 : 0;
    const mapped = ribbon ? travelWidth + (ribbon.link ? 1.4 : 3.6) : sidepath ? pathWidth : use === 'road' ? roadWidth(run) : 4.2;
    const width = run.crossSection?.width ?? mapped;
    // An approach carries the inventory deck width at the abutment and blends
    // to the mapped street width where its profile weight reaches bare earth.
    function taper(s: number) {
      const weights = run.deckWeight;
      if (!weights || !run.crossSection) return 1;
      const vertex = line.vertexAt(s), index = Math.min(Math.floor(vertex), weights.length - 2);
      const weight = weights[index] + (weights[index+1]-weights[index])*(vertex-index);
      return (mapped + weight * (width - mapped)) / width;
    }
    // Keep original corners as well as intermediate terrain samples. A structural
    // tread follows a single chord between its two DEM endpoint proxies.
    const stations = [0];
    for (let i = 1; i < line.cum.length; i++) {
      if (!bridge || !profile || run.deckWeight) {
        for (let s = line.cum[i - 1] + 2; s < line.cum[i]; s += 2) stations.push(s);
      }
      if (line.cum[i] > line.cum[i - 1]) stations.push(line.cum[i]);
    }

    const seam = Math.min(width, line.length / 2);
    if (bridge) {
      stations.push(seam, line.length - seam);
      stations.sort((a, b) => a - b);
    }
    if (ribbon) {
      for (let s=0; s<line.length; s+=12) { stations.push(s,Math.min(s+3,line.length)); }
      for (const row of ribbon.rows) {
        const pt=ribbon.line.at(row.s);
        const at=alongOn(ribbon,[start[0],start[1]]).s;
        const s=row.s-at;
        if (s>0 && s<line.length && Math.hypot(line.at(s).x-pt.x,line.at(s).z-pt.z)<1) stations.push(s);
      }
      stations.sort((a,b)=>a-b);
    }
    // Where another deck continues from this end at an angle, mitre the end on the bisector so
    // the two strips meet edge to edge, without a wedge on the outside of the bend. A raised
    // clustered deck has no ground under that wedge to hide it.
    const mitreAt = (end: 0 | 1) => {
      if (use !== 'road' || !bridge || !railCluster.has(owner)) return null;
      const p = end ? line.at(line.length) : line.at(0), key = (end ? run.pts.at(-1)! : run.pts[0]).join(',');
      for (const other of deckEnds.get(key) ?? []) {
        if (other === owner || other === run) continue;
        const q = other.pts[0].join(',') === key ? other.pts[1] : other.pts.at(-2)!;
        const o = other.pts[0].join(',') === key ? other.pts[0] : other.pts.at(-1)!;
        const len = Math.hypot(q[0] - o[0], q[1] - o[1]);
        if (!len) continue;
        // The other deck's direction leading away from the shared point, flipped to continue ours.
        const sign = end ? 1 : -1;
        const ox = sign * (q[0] - o[0]) / len, oz = sign * (q[1] - o[1]) / len;
        const cos = p.dx * ox + p.dz * oz;
        if (cos < Math.cos(Math.PI / 4) || cos > 0.99999) continue;
        const bx = p.dx + ox, bz = p.dz + oz, bl = Math.hypot(bx, bz);
        const half = Math.sqrt((1 + cos) / 2);
        return [-bz / bl / half, bx / bl / half] as const;
      }
      return null;
    };
    const mitres = [mitreAt(0), mitreAt(1)];
    function lateral(s:number,off:number): P2 {
      const p=line.at(s);
      const m = s === 0 ? mitres[0] : s === line.length ? mitres[1] : null;
      if (!ribbon && m) {
        // Keep the strip's own side: the mitre normal points the same way as p's normal.
        const flip = m[0] * p.nx + m[1] * p.nz < 0 ? -1 : 1;
        return [p.x + off * flip * m[0], p.z + off * flip * m[1]];
      }
      if (!ribbon) return [p.x+off*p.nx,p.z+off*p.nz];
      const row=sectionAt(ribbon,alongOn(ribbon,[p.x,p.z]).s);
      return stripePoint(row,.5-off/travelWidth);
    }
    const walkway = use === 'road' && WALKS.has(run.cls);
    const inferred = new Map<number, number>();
    // New needs (rail envelope, sidewalk weld) apply only where the deck can reach them at the
    // deck grade from an end that stays on the ground; others are left to the envelope check.
    const banks = [[0, startCut || startLevel !== null ? null : h0], [line.length, endCut || endLevel !== null ? null : h1]] as const;
    const feasible = (s: number, y: number) => banks.every(([at, bank]) =>
      bank === null || y - (bank - sceneZero) <= DECK_REACH * Math.abs(s - at));
    if (bridge && !profile) {
      // Sample the full tread width. Smooth the minimum upward along the span
      // so an intervening bank or crossing raises the approach on both sides.
      const below = new Map<Crossing, number>();
      for (const s of stations) {
        const p = line.at(s);
        for (const route of crossings.at(p.x, p.z)) {
          const {a, b} = route;
          const dx = b[0] - a[0], dz = b[1] - a[1];
          const cross = p.dx * dz - p.dz * dx;
          if (Math.abs(cross) <= .01) continue;
          const along = ((a[0]-p.x)*dz - (a[1]-p.z)*dx) / cross;
          const fraction = ((a[0]-p.x)*p.dz - (a[1]-p.z)*p.dx) / cross;
          const at = s + along;
          if (Math.abs(along) > 2 || fraction < 0 || fraction > 1 ||
              at <= route.radius || line.length-at <= route.radius) continue;
          below.set(route, at);
        }
      }
      for (const s of stations) {
        const p = line.at(s);
        let minimum = -Infinity;
        const divisions = Math.ceil(width / 1.5);
        const reach = RAIL_ENVELOPE_M + width / divisions / 2;
        for (let i = 0; i <= divisions; i++) {
          const [x,z] = lateral(s, width * (i / divisions - .5));
          const h = groundAt(x,z);
          if (h !== null) minimum = Math.max(minimum,h);
          if (clustered && h !== null && railBeds.at(x, z).some(([a, b]) => segDist(x, z, a, b) <= reach) && feasible(s, h + RAIL_CLEARANCE_M + 1))
            minimum = Math.max(minimum, h + RAIL_CLEARANCE_M + 1);
        }
        if (walkway && clustered) { const deck = viaductHeight(p); if (feasible(s, deck)) minimum = Math.max(minimum, deck); }
        for (const [{radius, clearance}, at] of below) {
          if (Math.abs(at - s) > radius) continue;
          const h = groundAt(p.x, p.z);
          if (h !== null) minimum = Math.max(minimum, h + clearance + 1);
        }
        inferred.set(s,minimum);
      }
      // Steepen the approach when a crossing is close to an abutment. The
      // propagated clearance must come back to the bank at an in-board end.
      for (const ordered of [stations, [...stations].reverse()]) {
        let last = ordered[0], height = inferred.get(last)!;
        const end = ordered.at(-1)!;
        // A clustered deck falls toward a solved end's level, not the ground under it.
        const solvedEnd = clustered ? (end === line.length ? endLevel : end === 0 ? startLevel : null) : null;
        const bank = solvedEnd ?? inferred.get(end)!;
        for (const s of ordered.slice(1)) {
          if (s === last) continue;
          const slope = Math.max(clustered ? DECK_GRADE : .15, (height - bank) / Math.abs(end - last));
          height = Math.max(inferred.get(s)!, height - slope * Math.abs(s - last));
          inferred.set(s, height);
          last = s;
        }
      }
    }
    const roadTop: number[] = [];
    // An elevated shoulder carries a low concrete parapet except where the
    // adjacent pavement opens for a merge. Check the outside of both ends and
    // the middle against all mapped travel strips, including the managed lane.
    function parapet(a: number[], b: number[], otherA: number[], otherB: number[]) {
      const offset = (p: number[], other: number[], distance: number) => {
        const length = Math.hypot(p[0]-other[0], p[2]-other[2]) || 1;
        return [p[0]+distance*(p[0]-other[0])/length, p[1], p[2]+distance*(p[2]-other[2])/length];
      };
      for (const distance of [-.28, .7, 1.8]) {
        const p = offset(a, otherA, distance), q = offset(b, otherB, distance);
        if (inConnectorLanes(p[0], p[2], .18) || inConnectorLanes(q[0], q[2], .18) ||
          inConnectorLanes((p[0]+q[0])/2, (p[2]+q[2])/2, .18)) return;
      }
      const p = offset(a, otherA, -.28), q = offset(b, otherB, -.28);
      const up = ([x,y,z]: number[]) => [x,y+.85,z];
      structures.quad(a,b,up(b),up(a),PAL.concrete);
      dropNext(2);
      structures.quad(q,p,up(p),up(q),PAL.concrete);
      structures.quad(up(a),up(b),up(q),up(p),PAL.concrete);
    }
    function strip(left: number, right: number, lift: number, color: string, depth = 0, textured = false, dashed = false, leftSide = true, rightSide = true,
      paint?: (s: number) => boolean) {
      const offsets = [left, right];
      const ends = bridge ? [0, line.length].map(s => {
        return offsets.map(off => {
          const [x,z]=lateral(s,off);
          return (s===0 ? firstSupport ?? startLevel : lastSupport ?? endLevel) ?? groundAt(THREE.MathUtils.clamp(x,bounds.minX,bounds.maxX),THREE.MathUtils.clamp(z,bounds.minZ,bounds.maxZ));
        });
      }) : [];
      let prev: number[][] | null = null, lastS = 0;
      let tread: FreightTreadPoint[] | undefined;
      let ballast: BallastQuad[] | null = null;
      // Ground ballast quads draw once their run is complete: whether each one is draped
      // or drawn flat over a cutting bed depends on its neighbours.
      const pending = new Map<BallastQuad[], ((flat: boolean) => void)[]>();
      const range = textured ? run.freightS : undefined;
      function midpoint(s: number, a: number[], b: number[]) {
        const distance = range![0] + (range![1] - range![0]) * s / line.length;
        tread!.push({ s: distance, position: new THREE.Vector3(
          (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2) });
      }
      for (const s of stations) {
        if (prev && s === lastS) continue;
        const p = line.at(s);
        const section: number[][] = [];
        for (const [i, offset] of offsets.entries()) {
          const [px,pz]=lateral(s,offset*taper(s));
          const x = THREE.MathUtils.clamp(px,bounds.minX,bounds.maxX);
          const z = THREE.MathUtils.clamp(pz,bounds.minZ,bounds.maxZ);
          let y = bridge ? h0! + (h1! - h0!) * (s / line.length) - sceneZero : groundAt(x, z);
          if (y === null) break;
          if (profile) {
            const vertex = line.vertexAt(s);
            const index = Math.min(Math.floor(vertex), profile.length - 2);
            y = profile[index] + (profile[index+1]-profile[index])*(vertex-index) - sceneZero;
            if (run.deckWeight) {
              const weights = run.deckWeight;
              const weight = weights[index] + (weights[index+1]-weights[index])*(vertex-index);
              const bare = groundAt(x,z);
              if (bare !== null) y = Math.max(bare, bare + weight * (y - bare));
            }
          } else if (bridge) {
            // Match the lateral grade of the approach just at the abutment. DEM
            // samples inside the freeway never set the height of the span.
            const end = s < line.length / 2 ? 0 : 1;
            const blend = Math.max(0, 1 - Math.min(s, line.length - s) / seam);
            const ref = end ? h1! : h0!;
            if (!(end ? endCut : startCut) && ends[end][i] !== null) y += blend * (ends[end][i]! - (ref - sceneZero));
          }
          if (inferred.size && (s > 0 || startCut) && (s < line.length || endCut)) y = Math.max(y, inferred.get(s)!);
          if (textured) y = freightGrade(x, z, y);
          section.push([x, y + lift, z]);
        }
        if (section.length < 2 || (!bridge && groundAt(p.x, p.z) === null)) { prev = null; ballast = null; continue; }
        if (range && range.every(Number.isFinite)) {
          if (!prev) {
            tread = [];
            freightTreads.push(tread);
          } else {
            // The middle of a twisted quad lies on its drawn triangle diagonal.
            midpoint((lastS + s) / 2, prev[0], section[1]);
          }
          midpoint(s, section[0], section[1]);
        }
        const drawQuad = prev && (!dashed || (lastS+s)/2 % 12 < 3) && (!paint || paint((lastS+s)/2));
        // A skipped quad breaks the ballast run, so quads either side aren't neighbours.
        if (!drawQuad) ballast = null;
        if (prev && drawQuad) {
          const [a, b] = prev, [d, c] = section;
          if (southFootbridge && depth > 0) {
            const floorY = Math.min(a[1], b[1], c[1], d[1]) - .05;
            footbridgeYields.push({ ring: [a, b, c, d].map(([x, , z]) => [x, z]), floor: () => floorY });
          }
          // Upward-facing top, optionally with concrete or steel fascia on both sides.
          if (use === 'road' && depth > 0) roadTop.push(structures.pos.length / 3, structures.pos.length / 3 + 3);
          const drawn = (terrainGround as DrapeGround).triangles;
          // Ground ballast, for graded cuttings. The East cut's freight sits in its own slot.
          const graded = textured && !bridge && run !== cut?.freight;
          // Ground ballast may draw after the loop, so it keeps this quad's own start station.
          const s0 = lastS;
          const draw = (flat: boolean) => { const lastS = s0; if (!flat && graded && drawn) {
            // Ground ballast follows the drawn terrain between its 2 m stations, so a
            // crease in the bank can't show through it (terrain/drape.ts). The raise is
            // capped at 25 cm: a graded cut sits below its bank on purpose, and the
            // freight treads (and trains) keep the station heights.
            const corners = [[a, 0, lastS], [b, 1, lastS], [c, 1, s], [d, 0, s]] as const;
            for (const [i, j, k] of [[0, 1, 2], [0, 2, 3]]) {
              const tri = [corners[i], corners[j], corners[k]];
              drapeTriangle(drawn, tri[0][0], tri[1][0], tri[2][0], lift, (...vs) => {
                freight.tri(vs[0].slice(0, 3), vs[1].slice(0, 3), vs[2].slice(0, 3), color);
                for (const v of vs) uv.push(v[3] * tri[0][1] + v[4] * tri[1][1] + v[5] * tri[2][1],
                  (v[3] * tri[0][2] + v[4] * tri[1][2] + v[5] * tri[2][2]) / .8);
              }, .25);
            }
          } else {
            (textured ? freight : structures).quad(a, b, c, d, color);
            if (textured) uv.push(0, lastS / .8, 1, lastS / .8, 1, s / .8, 0, lastS / .8, 1, s / .8, 0, s / .8);
          } };
          if (graded) {
            if (!ballast) { ballastRuns.push(ballast = []); pending.set(ballast, []); }
            ballast.push([a, b, c, d]);
            pending.get(ballast)!.push(draw);
          } else draw(false);
          if (textured && !bridge && gradeAvailable) {
            // Close exposed ballast faces where the raised approach clears the bare earth.
            for (const [left, right] of [[a, d], [c, b]]) {
              const gy = groundAt(left[0], left[2]), hy = groundAt(right[0], right[2]);
              if (gy !== null && hy !== null && (left[1] - gy > .25 || right[1] - hy > .25)) {
                structures.quad(left, right, [right[0], hy, right[2]], [left[0], gy, left[2]], PAL.ballastFreight);
              }
            }
          }
          if (depth) {
            if (profile && ribbon && use === 'road') {
              if (leftSide) parapet(a, d, b, c);
              if (rightSide) parapet(b, c, a, d);
            }
            const down = ([x, y, z]: number[]) => [x, y - depth, z];
            if (leftSide) structures.quad(a, d, down(d), down(a), PAL.concreteDark);
            if (rightSide) structures.quad(b, down(b), down(c), c, PAL.concreteDark);
            buriedFaces?.add(structures.pos.length / 3);
            buriedFaces?.add(structures.pos.length / 3 + 3);
            // A road deck's top casts the deck's shadow, so its underside is redundant far away.
            // A freight deck's top is in the freight mesh, which doesn't cast: its underside is
            // the viaduct's only horizontal shadow caster and must stay in the far prefix.
            if (use !== 'freight') dropNext(1);
            structures.quad(down(a), down(d), down(c), down(b), PAL.concreteDark);
          }
        }
        prev = section;
        lastS = s;
      }
      // A bedded quad stays flat over its carved bed, unless it reaches the board's edge
      // cells, which carve never moves (there only the drape can help).
      for (const [quads, draws] of pending) {
        const flags = bedFlags(quads, (x, z) => terrainGround(x, z));
        draws.forEach((draw, i) => draw(flags[i] && inCarvable(quads[i])));
      }
    }

    if (use === 'freight') {
      strip(2.1, -2.1, 0.13, '#ffffff', bridge ? 0.85 : 0, true);
    } else if (use === 'tram') {
      for (const offset of [-0.7175, 0.7175]) {
        strip(offset + .12, offset - .12, .06, '#534e48');
        strip(offset + .045, offset - .045, .075, '#b6b5ae');
      }
    } else {
      const color = ribbon ? PAL.asphaltHwy : sidepath ? pathConcrete : walkway ? PAL.sidewalk : PAL.asphalt;
      // At a deck toe the two shoulders and the center follow different
      // triangles of bare earth. Carry that crossfall into the pavement mesh.
      const bands = run.deckWeight ? 2 * Math.ceil(width / 6) : 1;
      for (let i = 0; i < bands; i++) {
        strip(width * (.5 - i/bands), width * (.5 - (i+1)/bands), .12, color,
          walkway ? .4 : .95, false, false, i === 0, i+1 === bands);
      }
      if (roadTop.length) roadTreads.set(owner, [...(roadTreads.get(owner) ?? []), ...roadTop]);
      if (ribbon) {
        for (let i=0;i<=ribbon.lanes;i++) {
          const offset=travelWidth*(.5-i/ribbon.lanes);
          strip(offset+.14,offset-.14,.15,i===0 && !ribbon.link ? PAL.lineYellow : PAL.lineWhite,0,false,i>0 && i<ribbon.lanes);
        }
      } else if (run.crossSection) {
        const { lanes, opposing } = run.crossSection;
        // Inventory lanes end where the taper would squeeze them below 2.5 m.
        // The mapped street's own centre line takes over at the toe.
        const paint = (s: number) => width * taper(s) / lanes >= 2.5;
        for (let lane=1; lane<lanes; lane++) {
          const off = width * (.5 - lane/lanes);
          const center = lane === opposing;
          strip(off+.09,off-.09,.15,center ? PAL.lineYellow : PAL.lineWhite,0,false,!center,true,true,paint);
        }
      } else if (!walkway && width >= 9) strip(.1, -.1, .15, PAL.lineYellow);
    }
  }

  // A raised concrete divider occupies only the narrow, surveyed ground median.
  // Trim the strip at the board edge and restart it after any terrain hole.
  for (const rows of connectorMedians(city)) {
    yield 'transport medians';
    let previous: number[][] | undefined;
    for (const row of rows) {
      const [x,z]=stripePoint(row,.5);
      const y=terrainGround(x,z);
      if (y===null || x<bounds.minX || x>bounds.maxX || z<bounds.minZ || z>bounds.maxZ) {
        previous=undefined; continue;
      }
      const width=Math.hypot(row.outer[0]-row.inner[0],row.outer[1]-row.inner[1]);
      const dx=(row.outer[0]-row.inner[0])/width,dz=(row.outer[1]-row.inner[1])/width;
      const section=[[-.36,0],[-.17,.84],[.17,.84],[.36,0]].map(([offset,h])=>[
        THREE.MathUtils.clamp(x+offset*dx,bounds.minX,bounds.maxX),y+h,
        THREE.MathUtils.clamp(z+offset*dz,bounds.minZ,bounds.maxZ)]);
      if (previous) for (let j=0;j<3;j++)
        structures.quad(previous[j],previous[j+1],section[j+1],section[j],PAL.concrete);
      previous=section;
    }
  }
  const sharedDecks = drawStreetBridges(city, grid.manifest.vertical.sceneZeroNavd88M, terrainGround, structures, roadTreads);
  drawKendedaWalk(city, sceneZero, terrainGround, structures, roadTreads, sharedDecks);
  drawClaraMeerBridge(city, sceneZero, terrainGround, structures, roadTreads, sharedDecks);
  const junctionWidths = new Map<TransportRun, number>();
  const landWalks = new Map<TransportRun,P2[][]>();
  const junctionRuns = drawJunctionDecks(city, grid.manifest.vertical.sceneZeroNavd88M, structures, roadTreads, junctionWidths, landWalks);
  for (const run of junctionRuns) sharedDecks.add(run);
  yield 'transport junctions';
  const sharedPositions = new THREE.Float32BufferAttribute(structures.pos,3);
  const junctionNodes = new Map<string,TransportRun[]>();
  for(const run of sharedDecks) if(run.cls==='secondary' || run.cls==='tertiary') {
    for(const p of run.pts) {
      const key=p.join(',');
      junctionNodes.set(key,[...(junctionNodes.get(key)??[]),run]);
    }
  }
  drawSeventeenthStreet(city, sceneZero, (x,z) => {
    const h = grid.sample(x,z);
    return h === null ? null : h-sceneZero;
  }, seventeenth, roadTreads, bridgeRuns);
  yield 'transport 17th street';
  for(const [owner,parts] of landWalks) for(const pts of parts) { draw({...owner,pts,kind:"ground"},"road",owner); yield 'transport walk'; }
  // Deck levels (deck-levels.ts). An inferred deck's end is pinned to the DEM only at a real
  // abutment: a ground carriageway, the board edge or a surveyed deck. Elsewhere connected
  // decks share a level set by what they clear. Road decks solve and draw first; their walks
  // (sidewalks mapped as their own bridges, footbridges between them) then solve against them.
  const bridgeRoads = data.roads.filter(road => !sharedDecks.has(road) && !bridgeRuns.has(road) && road.kind === 'bridge' && road.pts.length >= 2);
  const nodeKey = (p: P2) => p.join(',');
  const nodePoint = (key: string) => key.split(',').map(Number) as unknown as P2;
  const abutments = new Set<string>();
  for (const road of city.roads) if (!road.bridge && !road.tunnel && !WALKS.has(road.cls)) for (const p of road.pts) abutments.add(nodeKey(p));
  for (const road of data.roads) {
    const surveyed = !!road.deckNavd88M || sharedDecks.has(road) || bridgeRuns.has(road) || road.cls === 'motorway';
    if ((road.kind !== 'bridge' && !WALKS.has(road.cls)) || surveyed) for (const p of road.pts) abutments.add(nodeKey(p));
  }
  for (const key of junctionNodes.keys()) abutments.add(key);
  const fixedNode = (key: string) => {
    const [x, z] = nodePoint(key);
    return abutments.has(key) || x === bounds.minX || x === bounds.maxX || z === bounds.minZ || z === bounds.maxZ;
  };
  const demAt = (key: string) => {
    const h = grid.sample(...nodePoint(key));
    return h === null ? null : h - sceneZero;
  };
  levels = new Map<string, number>();
  const deckNeeds = new Map<TransportRun, { line: Line; needs: { s: number; y: number }[] }>();
  function needsOf(run: TransportRun, walk: boolean, checkReach = true) {
    const line = new Line(run.pts);
    const width = run.crossSection?.width ?? (sidepaths.has(run) ? pathWidth : roadWidth(run));
    const divisions = Math.ceil(width / 1.5), reach = RAIL_ENVELOPE_M + width / divisions / 2;
    const needs: { s: number; y: number }[] = [];
    for (let s = 0; ; s = Math.min(line.length, s + 2)) {
      const p = line.at(s);
      let y = -Infinity;
      for (let i = 0; i <= divisions; i++) {
        const off = width * (i / divisions - .5), x = p.x + off * p.nx, z = p.z + off * p.nz;
        const h = grid.sample(x, z);
        if (h !== null && railBeds.at(x, z).some(([a, b]) => segDist(x, z, a, b) <= reach)) y = Math.max(y, h - sceneZero + RAIL_CLEARANCE_M + 1);
      }
      if (walk) y = Math.max(y, viaductHeight(p));
      if (y > -Infinity && (!checkReach || reachable(run, s, line.length, y, walk))) needs.push({ s, y });
      if (s >= line.length) break;
    }
    const entry = { line, needs };
    deckNeeds.set(run, entry);
    return entry;
  }
  /** A need is taken only if it can be met at the deck grade from each fixed end of its run. */
  function reachable(run: TransportRun, s: number, length: number, y: number, walk: boolean) {
    for (const [p, distance] of [[run.pts[0], s], [run.pts.at(-1)!, length - s]] as const) {
      const key = nodeKey(p);
      const bank = walk && deckNodes.has(key) ? deckNodes.get(key)! : fixedNode(key) ? demAt(key) : null;
      if (bank !== null && y - bank > DECK_REACH * distance) return false;
    }
    return true;
  }
  const inferredRun = (run: TransportRun) => !run.deckNavd88M && run.cls !== 'motorway';
  function solve(runs: TransportRun[], walk: boolean, fixed: (key: string) => boolean, floor: (key: string) => number | null) {
    const solved = solveDeckLevels(runs.filter(inferredRun).map(run => {
      const { line, needs } = needsOf(run, walk);
      return { a: nodeKey(run.pts[0]), b: nodeKey(run.pts.at(-1)!), length: line.length, needs };
    }), floor, fixed);
    for (const [key, y] of solved) levels.set(key, y);
  }
  /** The level a deck must keep at an interior vertex (from its needs and solved ends). */
  function levelAt(run: TransportRun, i: number) {
    const entry = deckNeeds.get(run);
    if (!entry) return -Infinity;
    const s = entry.line.cum[i], length = entry.line.length;
    let y = Math.max((levels.get(nodeKey(run.pts[0])) ?? -Infinity) - DECK_GRADE * s,
      (levels.get(nodeKey(run.pts.at(-1)!)) ?? -Infinity) - DECK_GRADE * (length - s));
    for (const need of entry.needs) y = Math.max(y, need.y - DECK_GRADE * Math.abs(need.s - s));
    return y;
  }
  // Rail clusters: decks joined through free nodes to a deck that must clear a track.
  const clusterOf = new Map<string, string>();
  const find = (key: string): string => {
    const up = clusterOf.get(key) ?? key;
    if (up === key) return key;
    const root = find(up);
    clusterOf.set(key, root);
    return root;
  };
  const joinKeys = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) clusterOf.set(ra, rb); };
  const candidates = bridgeRoads.filter(inferredRun);
  candidates.forEach((run, i) => { for (const p of run.pts) if (!fixedNode(nodeKey(p))) joinKeys('run:' + i, nodeKey(p)); });
  const railRoots = new Set(candidates.flatMap((run, i) => needsOf(run, false).needs.length ? [find('run:' + i)] : []));
  railCluster = new Set(candidates.filter((_, i) => railRoots.has(find('run:' + i))));
  const roadDecks = bridgeRoads.filter(road => !WALKS.has(road.cls));
  solve(roadDecks.filter(road => railCluster.has(road)), false, fixedNode, demAt);
  function drawDeck(road: TransportRun) {
    // Lidar spans may cross a junction internal to one OSM way. Give each
    // carriageway piece its own width and keep the original deck lookup key.
    let from = 0;
    for (let i=1; i<road.pts.length-1; i++) {
      // A surface way ending under a deck held well above it does not meet it there.
      const junction = !road.deckNavd88M && surfaceJunctions.has(road.pts[i].join(',')) &&
        !(levelAt(road, i) > (demAt(nodeKey(road.pts[i])) ?? Infinity) + 2);
      const changesRibbon = road.cls === 'motorway' &&
        matchRibbon(road.pts[i-1],road.pts[i],road.sub==='link') !== matchRibbon(road.pts[i],road.pts[i+1],road.sub==='link');
      // A surface way ending on a shared interior vertex joins the tread there.
      if (junction || changesRibbon) {
        draw({...road,pts:road.pts.slice(from,i+1),deckNavd88M:road.deckNavd88M?.slice(from,i+1),deckWeight:road.deckWeight?.slice(from,i+1)},'road',road);
        from=i;
      }
    }
    draw(from ? {...road,pts:road.pts.slice(from),deckNavd88M:road.deckNavd88M?.slice(from),deckWeight:road.deckWeight?.slice(from)} : road,'road',road);
  }
  /** A clustered deck draws after any deck whose interior it ends on, so it can meet it. */
  function throughFirst(runs: TransportRun[]) {
    const within = new Set(runs), done = new Set<TransportRun>(), visiting = new Set<TransportRun>(), order: TransportRun[] = [];
    const visit = (run: TransportRun) => {
      if (done.has(run) || visiting.has(run)) return;
      visiting.add(run);
      if (railCluster.has(run)) for (const p of [run.pts[0], run.pts.at(-1)!])
        for (const other of vertexRuns.get(p.join(',')) ?? [])
          if (other !== run && within.has(other) && other.pts.slice(1, -1).some(q => q[0] === p[0] && q[1] === p[1])) visit(other);
      visiting.delete(run);
      done.add(run);
      order.push(run);
    };
    runs.forEach(visit);
    return order;
  }
  for (const road of throughFirst(roadDecks)) { drawDeck(road); yield 'transport bridge ' + road.cls; }
  // Walks read the road decks as drawn: a walk ending on one meets its tread.
  viaductPositions = new THREE.Float32BufferAttribute(structures.pos, 3);
  for (const deck of roadDecks) if (roadTreads.has(deck)) {
    const half = roadWidth(deck) / 2;
    for (let i = 1; i < deck.pts.length; i++)
      viaducts.add({ run: deck, a: deck.pts[i - 1], b: deck.pts[i], half }, [deck.pts[i - 1], deck.pts[i]], half + WELD_REACH_M);
  }
  for (const key of new Set(roadDecks.flatMap(road => road.pts.map(nodeKey)))) {
    const top = viaductTop(...nodePoint(key));
    if (top !== null) deckNodes.set(key, top);
  }
  // A walk end on a ground walk keeps the ground. Where the walk ends on mapped steps and an
  // easy ramp cannot reach every height it must keep, the end stays at deck level instead,
  // and a flight of steps is drawn down to the ground there.
  const groundWalks = new Set<string>(), groundSteps = new Map<string, P2>();
  const noteWalk = (pts: P2[], cls: string) => pts.forEach((p, i) => {
    groundWalks.add(nodeKey(p));
    if (cls === 'steps' && (i === 0 || i === pts.length - 1)) groundSteps.set(nodeKey(p), pts[i === 0 ? 1 : pts.length - 2]);
  });
  for (const road of city.roads) if (!road.bridge && !road.tunnel && WALKS.has(road.cls) && road.pts.length > 1) noteWalk(road.pts, road.cls);
  for (const road of data.roads) if (road.kind !== 'bridge' && WALKS.has(road.cls) && road.pts.length > 1) noteWalk(road.pts, road.cls);
  const clusterWalks = bridgeRoads.filter(road => WALKS.has(road.cls) && railCluster.has(road) && inferredRun(road));
  const unpinned = new Set<string>(), sidewalks = new Set<TransportRun>();
  for (const run of clusterWalks) {
    const { line, needs } = needsOf(run, true, false);
    let beside = 0, stations = 0;
    for (let s = 0; s <= line.length; s += 2, stations++) if (viaductHeight(line.at(s)) > -Infinity) beside++;
    const sidewalk = beside >= SIDEWALK_SHARE * stations;
    if (sidewalk) sidewalks.add(run);
    for (const [p, at] of [[run.pts[0], 0], [run.pts.at(-1)!, line.length]] as const) {
      const key = nodeKey(p), bank = demAt(key);
      if (!groundWalks.has(key) || deckNodes.has(key) || bank === null) continue;
      // A road's sidewalk (welded along most of its length) stays on its deck to the end; the
      // step down to a floor-level footway is left for a landing. A footbridge keeps the ground
      // there as before, except at mapped steps, where it stays up and a flight is drawn.
      if (sidewalk || (groundSteps.has(key) && needs.some(need => need.y - bank > DECK_REACH * Math.abs(need.s - at)))) unpinned.add(key);
    }
  }
  const pinned = (key: string) => groundWalks.has(key) && !unpinned.has(key);
  solve(clusterWalks, true, key => fixedNode(key) || deckNodes.has(key) || pinned(key), demAt);
  for (const road of throughFirst(bridgeRoads.filter(road => WALKS.has(road.cls)))) { drawDeck(road); yield 'transport bridge ' + road.cls; }
  // Where an unpinned walk end meets mapped steps, draw a flight down to the ground there:
  // stepped blocks in the walk's paving with a rail on each open side.
  for (const run of clusterWalks) for (const p of [run.pts[0], run.pts.at(-1)!]) {
    const key = nodeKey(p), toward = groundSteps.get(key);
    if (!toward || !unpinned.has(key)) continue;
    let top: number | null = null;
    for (const i of roadTreads.get(run) ?? []) { top = triangleHeight(livePositions, i, p[0], p[1]); if (top !== null) break; }
    const ground = terrainGround(p[0], p[1], run);
    if (top === null || ground === null || top - ground < .3) continue;
    stairs(p, toward, top, ground, roadWidth(run));
  }
  function stairs(from: P2, toward: P2, top: number, ground: number, width: number) {
    const length = Math.hypot(toward[0] - from[0], toward[1] - from[1]);
    if (!length) return;
    const dx = (toward[0] - from[0]) / length, dz = (toward[1] - from[1]) / length, nx = -dz, nz = dx;
    const rise = top - ground, count = Math.ceil(rise / STAIR_RISE_M), step = rise / count;
    const at = (s: number, off: number, y: number) => [from[0] + dx * s + nx * off, y, from[1] + dz * s + nz * off];
    const half = width / 2;
    for (let i = 0; i < count; i++) {
      const s0 = i * STAIR_GOING_M, s1 = s0 + STAIR_GOING_M, y = top - (i + 1) * step;
      const tread = [at(s0, -half, y), at(s0, half, y), at(s1, half, y), at(s1, -half, y)];
      structures.quad(tread[0], tread[1], tread[2], tread[3], PAL.sidewalk);
      structures.quad(at(s0, -half, y + step), at(s0, half, y + step), tread[1], tread[0], PAL.sidewalk);
      for (const side of [-half, half]) structures.quad(at(s0, side, y), at(s1, side, y), at(s1, side, ground), at(s0, side, ground), PAL.concreteDark);
    }
    const run = count * STAIR_GOING_M;
    for (const side of [-half, half]) {
      const a = at(0, side, top + STAIR_RAIL_M), b = at(run, side, ground + STAIR_RAIL_M);
      structures.quad(a, b, [b[0], b[1] - .06, b[2]], [a[0], a[1] - .06, a[2]], PAL.rail);
    }
  }
  for (const r of data.rail) if (!r.replaced) { draw(r, r.cls === 'tram' ? 'tram' : 'freight'); yield 'transport rail'; }
  // Mesh assembly (far ordering, registerFar) runs as one step from here: a build closed between
  // assemblies would otherwise leave a registered far form and this texture behind.
  yield 'transport meshes';
  const map = freightTexture();
  const meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>[] = [];
  const bridgeNight = { value: 0 };
  let farKeep = 0;
  for (const [builder, name] of [[structures, 'Decks and embedded rails'], [seventeenth, '17th Street Bridge'], [freight, 'Freight track']] as const) {
    if (!builder.pos.length) continue;
    const geometry = builder.geometry();
    const isFreight = builder === freight;
    if (builder === structures) {
      const marking = colourDrop(geometry, [PAL.lineWhite, PAL.lineYellow]);
      const { keep, newOfOld } = orderForFar(geometry, t => farDrop.has(t) || marking(t));
      farKeep = keep;
      // deckAt and the ground audit index triangles by their first vertex.
      const remap = (i: number) => 3 * newOfOld[i / 3];
      for (const [run, list] of roadTreads) if (!bridgeRuns.has(run)) roadTreads.set(run, list.map(remap));
      if (buriedFaces) {
        const moved = [...buriedFaces].map(remap);
        buriedFaces.clear();
        for (const i of moved) buriedFaces.add(i);
      }
    }
    if (builder === seventeenth) bridgePositions = geometry.getAttribute('position') as THREE.BufferAttribute;
    if (builder === structures) structurePositions = geometry.getAttribute('position') as THREE.BufferAttribute;
    if (isFreight) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide,
      map: isFreight ? map : null, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    if (builder === seventeenth) {
      // Contractor night photographs show lit steel and pier faces. Fill the
      // vertex colours locally without adding point lights to the whole City.
      material.onBeforeCompile = shader => {
        shader.uniforms.bridgeNight = bridgeNight;
        shader.vertexShader = 'varying float bridgeSpill;\n' + shader.vertexShader.replace(
          '#include <begin_vertex>', `#include <begin_vertex>
          float bankFade = smoothstep(-207.0,-167.0,position.x) * (1.0-smoothstep(112.0,136.0,position.x));
          float pierDistance = min(min(abs(position.x+135.0), abs(position.x+75.0)),
            min(abs(position.x+22.0),min(abs(position.x-26.0),abs(position.x-62.0))));
          float pool = mix(.35,1.0,1.0-smoothstep(1.5,16.0,pierDistance));
          float nearSpan = 1.0-smoothstep(20.0,36.0,abs(position.z+4192.0+.30*position.x));
          bridgeSpill = (1.0-.77*abs(normal.y)) * bankFade * pool * nearSpan;`);
        shader.fragmentShader = 'uniform float bridgeNight; varying float bridgeSpill;\n' + shader.fragmentShader.replace(
          '#include <opaque_fragment>',
          'outgoingLight += diffuseColor.rgb * vec3(.54, .40, .25) * bridgeNight * bridgeSpill;\n#include <opaque_fragment>');
      };
    }
    const mesh = new THREE.Mesh(geometry, material);
    if (builder === structures && buriedFaces) mesh.userData.groundAuditBuriedFaces = buriedFaces;
    mesh.name = name;
    mesh.castShadow = !isFreight; // The structural batch also contains the freight deck undersides.
    mesh.receiveShadow = true;
    if (builder === structures) registerFar(mesh, farKeep, { shadow: 'always' });
    group.add(mesh);
    meshes.push(mesh);
  }
  const cutting = cuttingYields(ballastRuns, (x, z) => terrainGround(x, z), carvable);
  cutting.push(...footbridgeYields);
  // The mesh attributes now own their copies. Drop build-time arrays held by the transport closures.
  const hasBridge = seventeenth.pos.length > 0;
  for (const builder of [structures, seventeenth, freight]) {
    builder.pos.length = 0;
    builder.col.length = 0;
  }
  uv.length = 0;
  return { group, freightTreads, deckAt, clearOfFreight, cutting, structuralTier: 'illustrative',
    setNight: hasBridge ? factor => { bridgeNight.value = factor; } : undefined, dispose() {
    group.removeFromParent();
    for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); }
    map.dispose();
    group.clear();
  } };
}
