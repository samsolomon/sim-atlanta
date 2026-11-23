import { residential } from '../city/residential';
import { createClaraMeer, gazeboId } from '../city/clara-meer';
import { createCuratedLandscape, curatedIds } from '../city/curated-landscape';
import { midtownFoundations } from '../city/midtown-foundations';
import { seventeenthPortals } from '../city/seventeenth-street';
import * as THREE from 'three';
import { Builder, pointInRing, type P2 } from '../vignette/geom';
import { World, clipRing, type BuildingFinish, type VBuilding, type VData } from '../vignette/world';
import { inConnectorLanes } from './connector-paint';
import { GroundGrid } from './grid';

import { GroundSurface, joinList, type TerrainJoins, type TerrainQuality } from './surface';
import type { OpenSlot } from './openings';
import type { TerrainCity } from './transport-data';
import { createMitchellHouse, mitchellId } from '../city/midtown-culture-mitchell';
import { createVarsity, varsityId } from '../city/midtown-culture-varsity';
import { createTechLandmark, techIds } from '../city/midtown-culture-tech';
import { createMidtownMarta } from '../city/midtown-marta';
import { createSkylineLandmark, skylineIds } from '../city/midtown-skyline';
import { artsCampusIds, createArtsCampusLandmark } from '../city/arts-campus';
import { createMidtownLandmark, midtownLandmarkIds } from '../city/midtown-landmarks';
import { midtownVents } from '../city/midtown-marta-vents';
import { underpassLights } from './underpass-lights';
import { bridgeApproaches } from './bridge-approaches';
import { streetPortals } from './street-bridges';
import { junctionPortals, onJunction } from './junction-decks';
import { groundMap } from './ground-map';
import { createTrees } from '../trees/render';
import { replacedBy, treeSitesIn } from '../trees/sites';

type Tree = [number, number, number, number];
type Contours = { value: number };
export interface DowntownTerrainOptions {
  quality: TerrainQuality;
  simpleLeafClumps?: boolean;
  join?: TerrainJoins;
  bottomY?: number;
  finishFor?: (building: VBuilding) => BuildingFinish | undefined;
  separateBuilding?: string;
  contours?: Contours;
  openings?: readonly OpenSlot[];
  /** Street and path lamps for this area, in the downtown night style. */
  lights?: Parameters<World['buildLights']>[3];
}

function checkBounds(grid: GroundGrid, city: VData) {
  for (const key of ['minX', 'maxX', 'minZ', 'maxZ'] as const) {
    if (city.bounds[key] !== grid.manifest.bounds[key]) throw new Error('City and ground extents differ');
  }
}

function makeBoard(mesh: GroundSurface, city: TerrainCity, quality: TerrainQuality, contours: Contours,
  join?: TerrainJoins, bottom = mesh.minY - mesh.grid.manifest.stepM) {
  const { vertical, bounds: b } = mesh.grid.manifest;
  const geometry = mesh.geometry;
  const material = new THREE.MeshLambertMaterial({ map: groundMap(city, quality) });
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
  surface.add(new THREE.Mesh(sides.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
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

function makeScenery(city: VData, trees: Tree[], quality: TerrainQuality, step: number,
  sceneY: (x: number, z: number) => number | null, { finishFor, separateBuilding, simpleLeafClumps }: Partial<DowntownTerrainOptions> = {},
  replacedTree: World['replacedTree'] = null) {
  const options = { terrain: 'flat' as const, clumps: quality === 'low' ? 3 : 8, lightMapMax: quality === 'low' ? 1024 : 2048 };
  class TerrainScenery extends World {
    override ground(x: number, z: number) { return sceneY(x, z)!; }
  }
  const world = new TerrainScenery(city, null, options);
  world.buildBuildings(bd => bd.id === separateBuilding ? null : foundation(bd.rings, sceneY, step / 2), quality === 'low' ? 3 : 8, finishFor);
  world.realTrees = trees.filter(([x, z]) => sceneY(x, z) !== null);
  world.replacedTree = replacedTree;
  world.buildTrees(simpleLeafClumps ? new THREE.OctahedronGeometry(1) : undefined);
  world.setSeason(180);
  return world;
}

/** City entry point. groundAt returns scene y on a drawn triangle, or null in a slot,
 * void or outside the board. Absolute DEM readings remain available via grid.sample. */
export function createDowntownTerrain(grid: GroundGrid, city: TerrainCity, trees: Tree[], options: DowntownTerrainOptions) {
  checkBounds(grid, city);
  city = midtownFoundations(city, grid.manifest.vertical.sceneZeroNavd88M);
  const mesh = new GroundSurface(grid, options.quality, options.openings, options.join);
  const bare = (x: number, z: number) => mesh.sampleScene(x, z);
  const board = makeBoard(mesh, city, options.quality, options.contours ?? { value: 0 }, options.join, options.bottomY);
  const lighting = underpassLights(city,mesh,board.material.map);
  if (lighting) board.add(lighting.group);
  const portals = [...streetPortals(city), ...junctionPortals(city), ...seventeenthPortals(city)];
  const approaches = portals.length ? bridgeApproaches(portals, grid.manifest.vertical.sceneZeroNavd88M, bare, city.bounds, city.roads) : null;
  if (approaches) {
    const top = new THREE.Mesh(approaches.geometry, board.material);
    top.receiveShadow = true;
    board.add(top, new THREE.Mesh(approaches.walls, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  }
  const groundAt = approaches?.groundAt ?? bare;
  const candidate = options.separateBuilding && city.buildings.find(b => b.id === options.separateBuilding);
  let sceneryCity = city;
  const landmarks: NonNullable<ReturnType<typeof createMidtownLandmark>>[] = [];
  for (const site of city.buildings) {
    const create = skylineIds.has(site.id) ? createSkylineLandmark
      : site.id === mitchellId ? createMitchellHouse
      : site.id === varsityId ? createVarsity
      : techIds.has(site.id) ? createTechLandmark
      : artsCampusIds.has(site.id) ? createArtsCampusLandmark
      : midtownLandmarkIds.has(site.id) ? createMidtownLandmark
      : curatedIds.has(site.id) ? createCuratedLandscape
      : site.id === gazeboId ? createClaraMeer : null;
    const landmark = create ? create(sceneryCity.buildings, site, foundation(site.rings, groundAt, grid.manifest.stepM / 2), groundAt)
      : createMidtownMarta(sceneryCity.buildings, site, groundAt);
    if (landmark) {
      sceneryCity = { ...sceneryCity, buildings: landmark.buildings };
      landmarks.push(landmark);
    }
  }
  const vents = midtownVents(city.bounds, groundAt);
  if (vents) landmarks.push(vents);
  // Houses: eave-height walls and pitched-roof finishes, fitted to the rendered ground.
  // Runs after the landmarks have claimed their sites.
  const homes = residential(sceneryCity, options.finishFor, groundAt, b => foundation(b.rings, groundAt, grid.manifest.stepM / 2), options.quality);
  sceneryCity = homes.city;
  options = { ...options, finishFor: homes.finishFor };
  const streetTrees = trees.filter(([x,z]) => !onJunction(city,x,z));
  // Named species trees (trees/sites.ts) replace the generic crown the canopy map traced there.
  const named = treeSitesIn(city.bounds);
  const scenery = makeScenery(sceneryCity, streetTrees, options.quality, grid.manifest.stepM, groundAt, options,
    named.length ? replacedBy(named) : null);
  for (const landmark of landmarks) scenery.group.add(landmark.group);
  // Yards by rule around every house (walks, drives, foundation planting).
  const yardLayer = homes.yards();
  if (yardLayer) scenery.group.add(yardLayer.group);
  const species = createTrees(named, options.quality, groundAt);
  if (species) scenery.group.add(species.group);
  if (options.lights) {
    // Landmark sites left the generic footprints the lamps avoid. Keep lamps out of them too.
    const sites = city.buildings.filter(site => !sceneryCity.buildings.includes(site)).flatMap(site => site.rings);
    const onSite = (x: number, z: number) => sites.some(ring => pointInRing(x, z, ring));
    scenery.buildLights(board, groundAt, (x, z) => inConnectorLanes(x, z) || onSite(x, z),
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
  const group = new THREE.Group();
  group.add(board, scenery.group);
  return {
    group, board, grid, buildingFragment: fragment?.group, scenery: scenery.group, bounds: grid.manifest.bounds,
    bottomY: options.bottomY ?? mesh.minY - grid.manifest.stepM, groundAt,
    openJoin(index = 0) { const wall = board.getObjectByName(index === 0 ? 'joining edge' : 'joining edge ' + index); if (wall) wall.visible = false; },
    setSeason(dayOfYear: number) { scenery.setSeason(dayOfYear); species?.setSeason(dayOfYear); },
    setNight(factor: number) { lighting?.setNight(factor); scenery.setNight(factor); fragment?.setNight(factor); landmarks.forEach(l => l.setNight(factor)); },
    setWet(factor: number) {
      board.material.color.setScalar(1 - 0.3 * factor);
      scenery.setWet(factor);
      species?.setWet(factor);
    },
    dispose() {
      group.removeFromParent();
      board.material.map?.dispose();
      board.traverse(obj => {
        if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); obj.material.dispose(); }
      });
      fragment?.group.removeFromParent();
      fragment?.dispose();
      species?.dispose();
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
