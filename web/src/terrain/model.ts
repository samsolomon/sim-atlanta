import { crownKey } from '../trees/rollout';
import { boardLines, daylightSlots, underpassMesh, type Underpass } from './underpass';
import { residential } from '../city/residential';
import { createClaraMeer, gazeboId } from '../city/clara-meer';
import { createCuratedLandscape, curatedIds } from '../city/curated-landscape';
import { midtownFoundations } from '../city/midtown-foundations';
import { createSeventeenthTower, seventeenthTowerId } from '../city/171-seventeenth';
import { create903Peachtree, peachtree903Id } from '../city/903-peachtree';
import { create25Pine, pine25Id } from '../city/25-pine';
import { createAscentMidtown, ascentMidtownId } from '../city/ascent-midtown';
import { amliArtsCenterId, createAmliArtsCenter } from '../city/amli-arts-center';
import { createOneCocaColaPlaza, oneCocaColaId } from '../city/one-coca-cola-plaza';
import { colony100Id, createColony100 } from '../city/colony-square';
import { create999Peachtree, peachtree999Id } from '../city/999-peachtree';
import { createNomia, nomiaId } from '../city/nomia';
import { createViewPoint, viewpointId } from '../city/viewpoint';
import { createProscenium, prosceniumId } from '../city/proscenium';
import { createHanoverMidtown, hanoverMidtownId } from '../city/hanover-midtown';
import { create77Twelfth, twelfth77Id } from '../city/77-twelfth';
import { createEmmiMidtown, emmiMidtownId } from '../city/emmi-midtown';
import { createMidtownUnion, midtownUnionId } from '../city/midtown-union';
import { create10Tenth, tenTenthId } from '../city/10-10th';
import { atlanticId, createAtlantic } from '../city/the-atlantic';
import { create1010Midtown, midtown1010Id } from '../city/1010-midtown';
import { create1075Peachtree, peachtree1075Id } from '../city/1075-peachtree';
import { createMetropolis, metropolisId } from '../city/metropolis';
import { createEuhmStaffDeck, euhmDeckId } from '../city/euhm-staff-deck';
import { createNcrHq, ncrId } from '../city/ncr-hq';
import { create1105WestPeachtree, westPeachtree1105Id } from '../city/1105-west-peachtree';
import { createLoews, loewsId } from '../city/loews-atlanta';
import { seventeenthPortals } from '../city/seventeenth-street';
import * as THREE from 'three';
import { Builder, pointInRing, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';
import { World, clipRing, type BuildingFinish, type VBuilding, type VData } from '../vignette/world';
import { inConnectorLanes } from './connector-paint';
import { GroundGrid } from './grid';

import { GroundSurface, joinList, type GroundYield, type TerrainJoins, type TerrainQuality } from './surface';
import type { OpenSlot } from './openings';
import type { TerrainCity } from './transport-data';
import { createCoda, codaIds } from '../city/midtown-culture-coda';
import { createScadAtlanta, scadAtlantaId } from '../city/midtown-culture-scad';
import { createRhodesHall, rhodesHallId } from '../city/midtown-culture-rhodes';
import { createMitchellHouse, mitchellId } from '../city/midtown-culture-mitchell';
import { createVarsity, varsityId } from '../city/midtown-culture-varsity';
import { createTechLandmark, techIds } from '../city/midtown-culture-tech';
import { createMidtownMarta } from '../city/midtown-marta';
import { createSkylineLandmark, skylineIds } from '../city/midtown-skyline';
import { artsCampusIds, createArtsCampusLandmark } from '../city/arts-campus';
import { batchLandmarks, landmarkBatchOff } from '../materials/landmark-batch';
import { createMidtownLandmark, midtownLandmarkIds } from '../city/midtown-landmarks';
import { midtownVents } from '../city/midtown-marta-vents';
import { activeOval } from '../city/active-oval';
import { houseLod } from '../city/house-lod';
import { piedmontPark } from '../city/piedmont-park';
import { pradoCraftsman, pradoCraftsmanId } from '../city/prado-craftsman';
import { WINN, winnPark } from '../city/winn-park';
import { underpassLights } from './underpass-lights';
import { bridgeApproaches } from './bridge-approaches';
import { streetPortals } from './street-bridges';
import { junctionPortals, onJunction } from './junction-decks';
import { groundMap } from './ground-map';
import type { DrapeGround } from './drape';
import { createTrees } from '../trees/render';
import { replacedBy, treeSitesIn } from '../trees/sites';
import { rolloutPlantings, rolloutRow, rolloutSpecies, treeMode } from '../trees/rollout-city';

type Tree = [number, number, number, number];
type Contours = { value: number };
export interface DowntownTerrainOptions {
  quality: TerrainQuality;
  simpleLeafClumps?: boolean;
  /** Optional continuous road axes for the painted terrain surface. */
  underpass?: Underpass;
  boardRoads?: TerrainCity['roads'];
  boardDetails?: (builder: Builder, ground: (x:number,z:number)=>number|null, material: THREE.MeshLambertMaterial) => void;
  join?: TerrainJoins;
  bottomY?: number;
  finishFor?: (building: VBuilding) => BuildingFinish | undefined;
  separateBuilding?: string;
  /** False leaves landmark meshes in their own groups, for tests that inspect a mounted model. */
  batchLandmarks?: boolean;
  contours?: Contours;
  openings?: readonly OpenSlot[];
  /** Street and path lamps for this area, in the downtown night style. */
  lights?: Parameters<World['buildLights']>[3];
  /** The tree rollout (trees/rollout-city.ts) for a canopy-map row: every crown of the row (the
   *  high tier's list) and the Ansley Park test. */
  rollout?: { row: string; lowCount: number; allCrowns: Tree[]; inAnsley?: (x: number, z: number) => boolean };
}

function checkBounds(grid: GroundGrid, city: VData) {
  for (const key of ['minX', 'maxX', 'minZ', 'maxZ'] as const) {
    if (city.bounds[key] !== grid.manifest.bounds[key]) throw new Error('City and ground extents differ');
  }
}

function makeBoard(mesh: GroundSurface, city: TerrainCity, quality: TerrainQuality, contours: Contours,
  join?: TerrainJoins, bottom = mesh.minY - mesh.grid.manifest.stepM, details?: DowntownTerrainOptions['boardDetails'], underpass?: Underpass) {
  const { vertical, bounds: b } = mesh.grid.manifest;
  const geometry = mesh.geometry;
  const material = new THREE.MeshLambertMaterial({ map: groundMap(city, quality, underpass) });
  // Draw true 2 m contours on the interpolated triangle surface, antialiased in screen space.
  material.onBeforeCompile = shader => {
    shader.uniforms.uContours = contours;
    shader.vertexShader = 'varying float vGroundM;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', `#include <begin_vertex>\n vGroundM = position.y + ${vertical.sceneZeroNavd88M.toFixed(4)};`);
    shader.fragmentShader = 'uniform float uContours; varying float vGroundM;\n' + shader.fragmentShader.replace(
      '#include <map_fragment>', `#include <map_fragment>
       float widthM = max(fwidth(vGroundM), 0.0001);
       float distM = abs(fract(vGroundM / 2.0 + 0.5) - 0.5) * 2.0;
       float contour = (1.0 - smoothstep(0.25, 1.5, distM / widthM))
         * smoothstep(0.0001, 0.01, widthM) * (1.0 - smoothstep(0.3, 1.0, widthM));
       diffuseColor.rgb *= mix(vec3(1.0), vec3(0.48, 0.55, 0.50), contour * uContours);`);
  };
  const surface = new THREE.Mesh(geometry, material);
  surface.receiveShadow = true;
  const sides = new Builder();
  const sideMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  details?.(sides, (x,z) => mesh.sampleScene(x,z), sideMaterial);
  const joins = joinList(join);
  const shared = joins.map(() => new Builder());
  const pos = geometry.getAttribute('position'), idx = geometry.index!;
  // Only skirt actual perimeter edges, including partial cells adjacent to an opening.
  const flags = new Uint8Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    flags[i] = Number(pos.getX(i) === b.minX) | Number(pos.getX(i) === b.maxX) * 2 |
      Number(pos.getZ(i) === b.minZ) * 4 | Number(pos.getZ(i) === b.maxZ) * 8;
  }
  function edge(a: number, b: number) {
    if (!(flags[a] & flags[b])) return;
    const ax = pos.getX(a), bx = pos.getX(b), az = pos.getZ(a), bz = pos.getZ(b);
    const which = joins.findIndex(edge => 'x' in edge
      ? ax === edge.x && bx === edge.x && Math.min(az, bz) >= edge.minZ && Math.max(az, bz) <= edge.maxZ
      : az === edge.z && bz === edge.z && Math.min(ax, bx) >= edge.minX && Math.max(ax, bx) <= edge.maxX);
    const wall = shared[which] ?? sides;
    wall.quad([pos.getX(a), bottom, pos.getZ(a)], [pos.getX(b), bottom, pos.getZ(b)],
      [pos.getX(b), pos.getY(b), pos.getZ(b)], [pos.getX(a), pos.getY(a), pos.getZ(a)], '#b59676');
  }
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
    if (flags[a] || flags[b] || flags[c]) { edge(a, b); edge(b, c); edge(c, a); }
  }
  surface.add(new THREE.Mesh(sides.geometry(), sideMaterial));
  shared.forEach((part, index) => {
    if (!part.pos.length) return;
    const wall = new THREE.Mesh(part.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    wall.name = index === 0 ? 'joining edge' : 'joining edge ' + index;
    surface.add(wall);
  });
  return surface;
}

// Sample long footprint edges too: their endpoints can both be on the banks of a cut.
function foundation(rings: P2[][], sceneY: (x: number, z: number) => number | null, step: number) {
  let base = Infinity;
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const [x, z] = ring[i], [x1, z1] = ring[(i + 1) % ring.length];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x, z1 - z) / step));
      for (let j = 0; j < n; j++) {
        const h = sceneY(x + (x1 - x) * j / n, z + (z1 - z) * j / n);
        if (h === null) return null;
        base = Math.min(base, h);
      }
    }
  }
  return Number.isFinite(base) ? Math.floor(base) : null;
}

/** Dev only: `?houses=near|far` pins every house tile to one version, for before-and-after checks. */
function houseLodForce() {
  if (!import.meta.env.DEV || typeof location === 'undefined') return undefined;
  const v = new URLSearchParams(location.search).get('houses');
  return v === 'near' || v === 'far' ? v : undefined;
}

function makeScenery(city: VData, trees: Tree[], quality: TerrainQuality, step: number,
  sceneY: (x: number, z: number) => number | null, { finishFor, separateBuilding, simpleLeafClumps }: Partial<DowntownTerrainOptions> = {},
  replacedTree: World['replacedTree'] = null, drawnElsewhere?: (bd: VBuilding) => boolean, crownSize: World['crownSize'] = null) {
  const options = { terrain: 'flat' as const, clumps: quality === 'low' ? 3 : 8, lightMapMax: quality === 'low' ? 1024 : 2048 };
  class TerrainScenery extends World {
    override ground(x: number, z: number) { return sceneY(x, z)!; }
  }
  const world = new TerrainScenery(city, null, options);
  // Tag what each pass adds, so the phone-perf report (core/perf.ts on studio-phone-perf's
  // branch) breaks memory out by category: 'buildings', 'trees' or 'landscape'.
  const tagNew = (from: number, perf: string) => world.group.children.slice(from).forEach(o => { o.userData.perf ??= perf; });
  let before = world.group.children.length;
  // Houses stay in the data (lamps and trees keep clear of them) but are drawn by house-lod.ts.
  world.buildBuildings(bd => bd.id === separateBuilding || drawnElsewhere?.(bd) ? null : foundation(bd.rings, sceneY, step / 2), quality === 'low' ? 3 : 8, finishFor);
  tagNew(before, 'buildings');
  world.realTrees = trees.filter(([x, z]) => sceneY(x, z) !== null);
  world.replacedTree = replacedTree;
  world.crownSize = crownSize;
  before = world.group.children.length;
  world.buildTrees(simpleLeafClumps ? new THREE.OctahedronGeometry(1) : undefined);
  tagNew(before, 'trees');
  world.setSeason(180);
  return world;
}

/**
 * Low-tier far ground (GroundSurface.farGeometry): 2 m error, drawn beyond 2.5 km. There a
 * screen pixel on a phone spans over 1 m (City's 22° lens), so the 2 m bound (4 m where a
 * cell stitches to finer ones) stays within a couple of pixels; the default (~12 km) and
 * skyline (~4.5 km) views are well beyond it, street views well inside.
 */
export const FAR_GROUND_M = 2500, FAR_GROUND_ERROR_M = 2;
let groundLodChanged = false;
/** True once after any board swapped its ground; City then redraws its manual shadow map. */
export function takeGroundLodChange() { const c = groundLodChanged; groundLodChanged = false; return c; }

/** City entry point. groundAt returns scene y on a drawn triangle, or null in a slot,
 * void or outside the board. Absolute DEM readings remain available via grid.sample. */
export function createDowntownTerrain(grid: GroundGrid, city: TerrainCity, trees: Tree[], options: DowntownTerrainOptions) {
  checkBounds(grid, city);
  city = midtownFoundations(city, grid.manifest.vertical.sceneZeroNavd88M);
  const zero = grid.manifest.vertical.sceneZeroNavd88M;
  const openings = options.underpass ? [...(options.openings ?? []), ...daylightSlots(options.underpass, zero)] : options.openings;
  const mesh = new GroundSurface(grid, options.quality, openings, options.join);
  const bare = (x: number, z: number) => mesh.sampleScene(x, z);
  const paintCity = options.boardRoads ? { ...city, roads: options.boardRoads } : city;
  const board = makeBoard(mesh, paintCity, options.quality, options.contours ?? { value: 0 }, options.join, options.bottomY, options.boardDetails, options.underpass);
  const trench = options.underpass && underpassMesh(options.underpass, city.bounds, board.material.map, bare, zero, boardLines(options.underpass, paintCity.roads));
  if (trench) board.add(trench.mesh);
  const lighting = underpassLights(city,mesh,board.material.map);
  if (lighting) board.add(lighting.group);
  const portals = [...streetPortals(city), ...junctionPortals(city), ...seventeenthPortals(city)];
  const approaches = portals.length ? bridgeApproaches(portals, grid.manifest.vertical.sceneZeroNavd88M, bare, city.bounds, city.roads) : null;
  if (approaches) {
    const top = new THREE.Mesh(approaches.geometry, board.material);
    top.name = 'bridge approaches';
    top.receiveShadow = true;
    board.add(top, new THREE.Mesh(approaches.walls, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  }
  // On the high tier the sampler also carries the drawn triangles, so ground-following
  // layers can drape (terrain/drape.ts). The low tier skips the drape until the phone
  // memory budget is known: it adds ~100k triangles across the board.
  // Forward the optional road: unconnected motorways must keep sampling bare earth.
  type Road = Parameters<NonNullable<typeof approaches>['groundAt']>[2];
  const groundAt = Object.assign((x: number, z: number, road?: Road) => approaches ? approaches.groundAt(x, z, road) : bare(x, z),
    { triangles: options.quality === 'high' ? mesh : undefined }) satisfies DrapeGround;
  const candidate = options.separateBuilding && city.buildings.find(b => b.id === options.separateBuilding);
  let sceneryCity = city;
  const landmarks: NonNullable<ReturnType<typeof createMidtownLandmark>>[] = [];
  for (const site of city.buildings) {
    const create = skylineIds.has(site.id) ? createSkylineLandmark
      : codaIds.has(site.id) ? createCoda
      : site.id === scadAtlantaId ? createScadAtlanta
      : site.id === rhodesHallId ? createRhodesHall
      : site.id === mitchellId ? createMitchellHouse
      : site.id === varsityId ? createVarsity
      : techIds.has(site.id) ? createTechLandmark
      : artsCampusIds.has(site.id) ? createArtsCampusLandmark
      : midtownLandmarkIds.has(site.id) ? createMidtownLandmark
      : curatedIds.has(site.id) ? createCuratedLandscape
      : site.id === gazeboId ? createClaraMeer : null;
    const landmark = site.id === seventeenthTowerId ? createSeventeenthTower(sceneryCity.buildings, site, grid)
      : site.id === peachtree903Id ? create903Peachtree(sceneryCity.buildings, site, grid)
      : site.id === pine25Id ? create25Pine(sceneryCity.buildings, grid, options.quality)
      : site.id === ascentMidtownId ? createAscentMidtown(sceneryCity.buildings, grid, options.quality)
      : site.id === amliArtsCenterId ? createAmliArtsCenter(sceneryCity.buildings, grid, options.quality)
      : site.id === oneCocaColaId ? createOneCocaColaPlaza(sceneryCity.buildings, site, grid)
      : site.id === colony100Id ? createColony100(sceneryCity.buildings, grid)
      : site.id === peachtree999Id ? create999Peachtree(sceneryCity.buildings, site, grid)
      : site.id === nomiaId ? createNomia(sceneryCity.buildings, site, grid)
      : site.id === viewpointId ? createViewPoint(sceneryCity.buildings, site, grid)
      : site.id === prosceniumId ? createProscenium(sceneryCity.buildings, site, grid)
      : site.id === hanoverMidtownId ? createHanoverMidtown(sceneryCity.buildings, site, grid)
      : site.id === twelfth77Id ? create77Twelfth(sceneryCity.buildings, grid, options.quality)
      : site.id === emmiMidtownId ? createEmmiMidtown(sceneryCity.buildings, site, grid)
      : site.id === midtownUnionId ? createMidtownUnion(sceneryCity.buildings, site, grid)
      : site.id === tenTenthId ? create10Tenth(sceneryCity.buildings, site, grid)
      : site.id === atlanticId ? createAtlantic(sceneryCity.buildings, site, grid)
      : site.id === midtown1010Id ? create1010Midtown(sceneryCity.buildings, site, grid)
      : site.id === peachtree1075Id ? create1075Peachtree(sceneryCity.buildings, site, grid)
      : site.id === metropolisId ? createMetropolis(sceneryCity.buildings, site, grid)
      : site.id === euhmDeckId ? createEuhmStaffDeck(sceneryCity.buildings, site, grid)
      : site.id === ncrId ? createNcrHq(sceneryCity.buildings, site, grid)
      : site.id === westPeachtree1105Id ? create1105WestPeachtree(sceneryCity.buildings, site, grid)
      : site.id === loewsId ? createLoews(sceneryCity.buildings, site, grid)
      : create ? create(sceneryCity.buildings, site, foundation(site.rings, groundAt, grid.manifest.stepM / 2), groundAt)
      : createMidtownMarta(sceneryCity.buildings, site, groundAt);
    if (landmark) {
      sceneryCity = { ...sceneryCity, buildings: landmark.buildings };
      landmarks.push(landmark);
    }
  }
  // Hard surfaces the drawn terrain yields to (stair runs cut into a slope).
  // Carve before anything else samples the ground inside their footprints.
  const winn = winnPark(city, groundAt, options.quality);
  const yields = [...landmarks.flatMap(l => (l as { yields?: GroundYield[] }).yields ?? []), ...(winn?.yields ?? [])];
  if (yields.length) mesh.carve(yields);
  // Low tier: a far mesh (2 m error, cells up to 160 m) drawn instead of the board's own
  // triangles once the camera is over 2.5 km away. Render-only: placement, the audit and
  // every seam keep the near triangles; the rim is shared node for node. It is built from
  // the DEM, so it does not show stair or rail carves (sub-pixel at that range), and it is
  // built eagerly (2.9 MB across the rectangle) so a swap never stalls a frame.
  const nearGeometry = mesh.geometry;
  const farGeometry = options.quality === 'low' && GroundSurface.farLow ? mesh.farGeometry(FAR_GROUND_ERROR_M) : null;
  const bb = grid.manifest.bounds;
  let far = false;
  const vents = midtownVents(city.bounds, groundAt);
  if (vents) landmarks.push(vents);
  // Houses: eave-height walls and pitched-roof finishes, fitted to the rendered ground.
  // Runs after the landmarks have claimed their sites.
  const originalFinish = options.finishFor;
  const homes = residential(sceneryCity, b => b.id === pradoCraftsmanId ? pradoCraftsman(groundAt) : originalFinish?.(b), groundAt, b => foundation(b.rings, groundAt, grid.manifest.stepM / 2), options.quality, undefined, city.buildings, trees);
  sceneryCity = homes.city;
  options = { ...options, finishFor: homes.finishFor };
  // Yard terraces have hard shelves and treads. Carve before scenery/tree placement.
  const yardLayer = homes.yards();
  if (yardLayer?.yields.length) mesh.carve(yardLayer.yields);
  let streetTrees = trees.filter(([x,z]) => !onJunction(city,x,z));
  // Named species trees (trees/sites.ts) replace the generic crown the canopy map traced there.
  const named = treeSitesIn(city.bounds);
  const namedReplace = named.length ? replacedBy(named) : null;
  // The tree rollout: some canopy crowns become a picked species; Ansley crowns are sized and paired.
  const drawTrees = treeMode(typeof location === 'undefined' ? '' : location.search);
  const rollout = options.rollout ? rolloutRow({
    roads: city.roads, ground: city.ground, buildings: city.buildings, bounds: city.bounds,
    roundTwo: { id: options.rollout.row, eligible: new Set(options.rollout.allCrowns.slice(0, options.rollout.lowCount)
      .filter(([x, z, , r]) => !namedReplace?.(x, z, r)).map(([x, z]) => crownKey(x, z))) },
    allCrowns: options.rollout.allCrowns.filter(([x, z]) => !onJunction(city, x, z)), tierCrowns: streetTrees, inAnsley: options.rollout.inAnsley,
    // `?trees=all-species`: convert only crowns the generic World would draw (its bounds and
    // building test), and leave named sites to trees/sites.ts.
    generic: drawTrees === 'generic',
    preview: drawTrees === 'all-species' ? (blocks => ({
      drawn: (x, z) => x > city.bounds.minX + 1 && x < city.bounds.maxX - 1 && z > city.bounds.minZ + 1 && z < city.bounds.maxZ - 1
        && !blocks.at(x, z).some(ring => pointInRing(x, z, ring)),
      managed: namedReplace ?? undefined,
    }))(new PlacementIndex<P2[]>().addAll(sceneryCity.buildings.map(bd => bd.rings[0]))) : undefined,
  }) : null;
  if (rollout) streetTrees = rollout.crowns;
  const replace: World['replacedTree'] = rollout
    ? (x, z, cr) => !!namedReplace?.(x, z, cr) || rollout.replaced(x, z)
    : namedReplace;
  // Trees landmarks plant at their own height (1180 Peachtree's terrace crape myrtles).
  const spots = landmarks.flatMap(l => (l as { plantings?: { x: number; z: number; y: number }[] }).plantings ?? [])
    .filter(({ x, z }) => x >= city.bounds.minX && x < city.bounds.maxX && z >= city.bounds.minZ && z < city.bounds.maxZ);
  // Generic (the default): they join the row's generic crowns, appended so no colour seed moves,
  // as 4.5 m broadleaves (the species planting's size) standing on the roof, not the ground.
  const genericSpots = drawTrees === 'generic' ? new Map(spots.map(p => [crownKey(p.x, p.z), p])) : null;
  if (genericSpots?.size) streetTrees = [...streetTrees, ...spots.map(p => [p.x, p.z, 4.5, 2] as Tree)];
  const sceneryGround = genericSpots?.size ? (x: number, z: number) => genericSpots.get(crownKey(x, z))?.y ?? groundAt(x, z) : groundAt;
  const crownSize: World['crownSize'] = genericSpots?.size
    ? (x, z) => genericSpots.has(crownKey(x, z)) ? { h: 4.5, r: 2, broadleaf: true } : rollout?.crownSize(x, z)
    : rollout?.crownSize ?? null;
  const scenery = makeScenery(sceneryCity, streetTrees, options.quality, grid.manifest.stepM, sceneryGround, options,
    replace, bd => homes.isHouse(bd.id), crownSize);
  // Houses by distance: a bare far version for wide views, the full house when the camera comes close.
  const houses = houseLod({
    houses: sceneryCity.buildings.filter(bd => homes.isHouse(bd.id) && bd.id !== options.separateBuilding), bounds: city.bounds, ground: groundAt,
    foundation: bd => foundation(bd.rings, groundAt, grid.manifest.stepM / 2), near: homes.finishFor, far: homes.farFinishFor,
    roofUnits: options.quality === 'low' ? 3 : 8, force: houseLodForce(),
  });
  scenery.group.add(houses.group);
  for (const landmark of landmarks) { landmark.group.userData.perf = 'buildings'; scenery.group.add(landmark.group); }
  // Static landmark parts that draw alike share one draw per 500 m cell (materials/landmark-batch.ts).
  const batches = !landmarkBatchOff && options.batchLandmarks !== false && landmarks.length ? batchLandmarks(landmarks, scenery.group, { name: 'Landmark batches' }) : null;
  if (batches) {
    scenery.group.add(batches.group);
    if (import.meta.env.DEV) console.info('City landmark batches', JSON.stringify(batches.stats));
  }
  // Yards by rule around every house (walks, drives, foundation planting).
  if (yardLayer) { yardLayer.group.userData.perf = 'landscape'; scenery.group.add(yardLayer.group); }
  // Piedmont Park's Active Oval: backstops, goals, nets and its west retaining walls (high tier).
  const oval = activeOval(city.bounds, groundAt, options.quality);
  if (oval) { oval.group.userData.perf = 'landscape'; scenery.group.add(oval.group); }
  // Piedmont Park furniture at mapped points, entrance map kiosks (high tier) and the 10th Street gate.
  const park = piedmontPark(city, groundAt, options.quality);
  if (park) { park.group.userData.perf = 'landscape'; scenery.group.add(park.group); }
  if (winn) { winn.group.userData.perf = 'landscape'; scenery.group.add(winn.group); }
  const species = createTrees(named, options.quality, groundAt);
  if (species) { species.group.userData.perf = 'trees'; scenery.group.add(species.group); }
  // Drawn by the City-wide rollout batch (trees/rollout-city.ts), not in this row's scenery.
  const rolled = rollout ? rolloutSpecies(rollout.plan, options.quality, groundAt, undefined,
    city.ground?.some(g => g.name === 'Winn Park') ? [WINN.floor] : []) : null;
  // Trees landmarks plant (1180 Peachtree's terrace crape myrtles), drawn by the same batch.
  const planted = genericSpots ? null : rolloutPlantings(spots, options.quality);
  if (options.lights) {
    // Landmark sites left the generic footprints the lamps avoid. Keep lamps out of them too.
    const sites = city.buildings.filter(site => !sceneryCity.buildings.includes(site)).flatMap(site => site.rings);
    const onSite = (x: number, z: number) => sites.some(ring => pointInRing(x, z, ring));
    const reclaimedBed = (x: number,z: number) => {
      if (!options.underpass) return false;
      const [s,t] = options.underpass.local(x,z);
      return Math.abs(t)<=options.underpass.halfWidth+2 && options.underpass.spans.some(
        span => span.finish==='disused-ballast' && s>=span.start && s<=span.end);
    };
    scenery.buildLights(board, groundAt, (x, z) => inConnectorLanes(x, z) || onSite(x, z) || reclaimedBed(x,z),
      { ...options.lights, lowDetail: options.quality === 'low' });
  }
  let fragment: World | undefined;
  if (candidate) {
    const rings = candidate.rings.map(r => clipRing(r, city.bounds)).filter(r => r.length >= 3);
    if (rings.length) {
      // A part whose outer ring clips away is dropped, so a hole never becomes its wall.
      const parts = candidate.parts?.map(part => ({ ...part, rings: part.rings.map(r => clipRing(r, city.bounds)) }))
        .filter(part => part.rings[0].length >= 3).map(part => ({ ...part, rings: part.rings.filter(r => r.length >= 3) }));
      fragment = makeScenery({ ...city, buildings: [{ ...candidate, rings, parts }], roads: [], rail: [] }, [],
        options.quality, grid.manifest.stepM, groundAt, { finishFor: options.finishFor });
      fragment.group.name = candidate.id;
      scenery.group.add(fragment.group);
    }
  }
  const carved: GroundYield[] = [];
  const group = new THREE.Group();
  group.add(board, scenery.group);
  return {
    group, board, grid, buildingFragment: fragment?.group, scenery: scenery.group, bounds: grid.manifest.bounds,
    bottomY: options.bottomY ?? mesh.minY - grid.manifest.stepM, groundAt,
    /** Drawn terrain triangles only, without bridge approaches. */
    terrainAt: bare,
    /** Lower the drawn terrain under hard surfaces placed after the board was built,
     * such as graded rail cuttings (terrain/cutting.ts). Layers already placed keep their heights. */
    carve(yields: readonly GroundYield[]) { if (yields.length) { mesh.carve(yields); carved.push(...yields); } },
    /** Footprints carved after the board was built, for checks that scenery isn't left floating. */
    carved: carved as readonly GroundYield[],
    /**
     * Swap the board between its near and far ground by the camera's distance to the board's
     * box: far beyond FAR_GROUND_M, near again inside 0.9 × that. Allocation-free (it runs every
     * frame); a swap flags the manual shadow map for a redraw (takeGroundLodChange).
     */
    update(_dt: number, camera: THREE.Camera) {
      if (!farGeometry) return;
      const p = camera.position;
      const dx = Math.max(bb.minX - p.x, 0, p.x - bb.maxX), dz = Math.max(bb.minZ - p.z, 0, p.z - bb.maxZ);
      const d = Math.hypot(dx, dz, Math.max(0, p.y - mesh.minY));
      const next = far ? d > 0.9 * FAR_GROUND_M : d > FAR_GROUND_M;
      if (next !== far) { far = next; board.geometry = far ? farGeometry : nearGeometry; groundLodChanged = true; }
    },
    openJoin(index = 0) { const wall = board.getObjectByName(index === 0 ? 'joining edge' : 'joining edge ' + index); if (wall) wall.visible = false; },
    /** Generic-tree level of detail (see World.setDetail). */
    setDetail(d: { farTrees?: boolean; branchShadows?: boolean }) { scenery.setDetail(d); species?.setDetail(d); rolled?.setDetail(d); },
    setSeason(dayOfYear: number) { scenery.setSeason(dayOfYear); species?.setSeason(dayOfYear); rolled?.setSeason(dayOfYear); },
    setNight(factor: number) { trench?.setNight(factor); lighting?.setNight(factor); scenery.setNight(factor); fragment?.setNight(factor); landmarks.forEach(l => l.setNight(factor)); batches?.sync(); park?.setNight(factor); houses.setNight(factor); },
    setWet(factor: number) {
      trench?.setWet(factor);
      board.material.color.setScalar(1 - 0.3 * factor);
      scenery.setWet(factor);
      houses.setWet(factor);
      species?.setWet(factor);
      rolled?.setWet(factor);
    },
    dispose() {
      group.removeFromParent();
      board.material.map?.dispose();
      board.traverse(obj => {
        if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); obj.material.dispose(); }
      });
      // The traverse disposed whichever ground is attached; release the other one.
      (board.geometry === nearGeometry ? farGeometry : nearGeometry)?.dispose();
      fragment?.group.removeFromParent();
      fragment?.dispose();
      species?.dispose();
      rolled?.dispose();
      planted?.dispose();
      // Also unregisters the yard planting from the ink pass.
      yardLayer?.dispose();
      oval?.dispose();
      park?.dispose();
      winn?.dispose();
      houses.dispose();
      scenery.dispose();
      group.clear();
    },
  };
}

// Compatibility with the standalone evidence preview and Control's contours uniform.
export function terrainModel(grid: GroundGrid, city: VData, contours: Contours = { value: 1 }) {
  checkBounds(grid, city);
  return makeBoard(new GroundSurface(grid, 'high'), city, 'high', contours);
}
export function cityScenery(grid: GroundGrid, city: VData, trees: Tree[]) {
  const mesh = new GroundSurface(grid, 'high');
  try {
    return makeScenery(city, trees, 'high', grid.manifest.stepM, (x, z) => mesh.sampleScene(x, z)).group;
  } finally {
    mesh.geometry.dispose();
  }
}
