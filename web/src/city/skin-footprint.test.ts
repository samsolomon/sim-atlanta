import { readdirSync, readFileSync, existsSync } from 'node:fs';
import type { Mesh, Object3D } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import { coplanarLayers, detachedParts, footprintReport, type CoplanarReport, type FootprintLimits } from './skin-kit';

// The skin footprint audit. Every landmark the terrain builder mounts on a committed board
// (pipeline/prototypes/square-board: the Midtown rows, Brookwood and the square-board bands,
// including the skyline registry) must keep every vertex, shell and lamps alike, inside the
// footprints it replaced expanded by its declared maxProjection (2.5 m by default), and above
// the lowest grade less 8 m. A skin declares a larger projection, with the photo evidence,
// as `group.userData.footprint: FootprintLimits` where its photos show one (canopies, marquees).
// Downtown uses the committed snapshot of the staged buildings and City's mount order. Both check for detached parts and near-coplanar layers.
const source = new URL('../../../pipeline/prototypes/square-board/', import.meta.url);
const boards = readdirSync(source).filter(id => existsSync(new URL(id + '/context.json', source)));
afterEach(() => vi.unstubAllGlobals());

interface Failure { id: string; board: string; worst: number; outside: number; at: [number, number, number]; vertical: number; detached: number; detachedAt: [number, number, number]; detachedGap: number; coplanar: CoplanarReport }

function audit(landmark: Object3D, replaced: VBuilding[], grid: GroundGrid, board: string, label = landmark.name): Failure {
  const rings = replaced.flatMap(b => b.rings.slice(0, 1));
  expect(rings.length, `${label} on ${board} has no replaced footprint`).toBeGreaterThan(0);
  const id = (replaced[0]?.id ?? label) + (replaced.length > 1 ? ` (+${replaced.length - 1})` : '') + ' ' + JSON.stringify(label);
  const grades = rings.flat().map(([x, z]) => grid.sample(x, z) ?? 0);
  const limits: FootprintLimits = {
    bottom: Math.min(...grades) - grid.manifest.vertical.sceneZeroNavd88M - 8,
    ...landmark.userData.footprint,
  };
  const r = footprintReport(landmark, rings, limits);
  const loose = detachedParts(landmark, rings);
  return { id, board, worst: +r.worst.toFixed(2), outside: +r.outside.toFixed(2),
    at: r.at.map(v => +v.toFixed(1)) as Failure['at'], vertical: +r.vertical.toFixed(2),
    detached: loose.length, detachedAt: (loose[0]?.at ?? [0, 0, 0]).map(v => +v.toFixed(1)) as Failure['detachedAt'],
    detachedGap: +(loose[0]?.gap ?? 0).toFixed(2), coplanar: coplanarLayers(landmark) };
}

function loadGrid(directory: URL) {
  const manifest = JSON.parse(readFileSync(new URL('ground.json', directory), 'utf8'));
  const samples = Uint8Array.from(readFileSync(new URL('ground.i16', directory))).buffer;
  return new GroundGrid(manifest, samples);
}

/** Builds one board and audits every landmark on it. */
function auditBoard(id: string, quality: 'high' | 'low') {
  const directory = new URL(id + '/', source);
  const grid = loadGrid(directory);
  const context = JSON.parse(readFileSync(new URL('context.json', directory), 'utf8'));
  const area = createDowntownTerrain(grid, { ...context, rail: context.rail ?? [], roads: context.roads ?? [] }, [], { quality, batchLandmarks: false });
  const byId = new Map<string, VBuilding>((context.buildings as VBuilding[]).map(b => [b.id, b]));
  const results: Failure[] = [];
  area.scenery.traverse(landmark => {
    const ids: string[] | undefined = landmark.userData.replaced;
    if (!ids) return;
    const replaced = ids.flatMap(id => byId.get(id) ?? []);
    if (replaced.length) results.push(audit(landmark, replaced, grid, id));
  });
  return results;
}

type GroundAt = (x: number, z: number) => number | null;
type DowntownCreator = (buildings: VBuilding[], ground: GroundGrid | GroundAt) =>
  { group: Object3D; buildings: VBuilding[] } | null;
const downtownModules = import.meta.glob<Record<string, DowntownCreator>>(['./*.ts', '!./*.test.ts', '!./city.ts']);

async function auditDowntown() {
  const grid = loadGrid(new URL('../../../pipeline/prototypes/downtown-ground/', import.meta.url));
  const { buildings }: { buildings: VBuilding[] } = JSON.parse(readFileSync(new URL('./fixtures/downtown-buildings.json', import.meta.url), 'utf8'));
  const groundAt: GroundAt = (x, z) => {
    const height = grid.sample(x, z);
    return height === null ? null : height - grid.manifest.vertical.sceneZeroNavd88M;
  };
  const city = readFileSync(new URL('./city.ts', import.meta.url), 'utf8');
  // Floyd needs the station passage. The terrain chain starts after Floyd and uses either
  // the grid or a scene-relative sampler (also spelled inline by the Capitol mount).
  const terrain = city.split("await build('terrain', () => {")[1]?.split('terrain = createDowntownTerrain')[0];
  if (!terrain) throw new Error('Could not find the downtown terrain mount block in city.ts');
  const calls = /= (create\w+)\(/g;
  const statements = /(?:const )?(\w+) = (?:(create\w+)\(([^,\n]+), (groundAt|ground|\(x, z\) =>)|([\w?. ]+);)/g;
  const mounts = [...terrain.matchAll(statements)];
  const creators = mounts.flatMap(([, , name]) => name ? [name] : []);
  expect(creators.length).toBeGreaterThanOrEqual(63);
  expect(creators).toEqual([...terrain.matchAll(calls)].map(([, name]) => name));
  const imports = new Map<string, string>();
  for (const [, names, module] of city.matchAll(/import \{ ([^}]+) \} from '(\.\/[^']+)';/g)) {
    for (const name of names.split(', ')) imports.set(name, module + '.ts');
  }

  // Resolve the actual first argument of each builder, including the nullish aliases.
  // A stale alias would otherwise pass the test while leaving generic geometry in City.
  const inputs = new Map<string, VBuilding[]>([['vd.buildings', buildings]]);
  function resolve(expression: string): VBuilding[] {
    for (const term of expression.trim().split(/\s*\?\?\s*/)) {
      const found = inputs.get(term);
      if (found) return found;
      if (term !== 'floyd?.buildings') throw new Error(`Unknown downtown buildings input: ${term}`);
    }
    throw new Error(`Missing downtown buildings input: ${expression}`);
  }
  let remaining = buildings;
  const results: Failure[] = [];
  for (const [, binding, name, input, ground, alias] of mounts) {
    if (alias) {
      inputs.set(binding, resolve(alias));
      continue;
    }
    const candidate = resolve(input);
    expect(candidate === remaining, `${name} must receive the updated downtown buildings`).toBe(true);
    const load = downtownModules[imports.get(name) ?? ''];
    expect(load, `module for ${name}`).toBeDefined();
    const built = (await load())[name](candidate, ground === 'ground' ? grid : groundAt);
    if (!built) throw new Error(`${name} did not mount with the committed downtown fixture`);
    let hasGeometry = false;
    built.group.traverse(object => {
      const mesh = object as Mesh;
      if (mesh.isMesh && mesh.geometry.getAttribute('position')?.count) hasGeometry = true;
    });
    expect(hasGeometry, `${name} mounted without geometry`).toBe(true);
    const retained = new Set(built.buildings.map(b => b.id));
    const replaced = candidate.filter(b => !retained.has(b.id));
    results.push(audit(built.group, replaced, grid, 'downtown', built.group.name || name));
    remaining = built.buildings;
    inputs.set(binding + '?.buildings', remaining);
  }
  const finalInput = terrain.match(/const city = \{ \.\.\.vd, buildings: ([^,]+),/);
  if (!finalInput) throw new Error('Could not find the buildings passed to downtown terrain');
  expect(resolve(finalInput[1]) === remaining, 'generic scenery must use the final downtown buildings').toBe(true);
  return results;
}

/**
 * Known failures on main when the audit landed (2026-11-24), at their worst offset past the
 * allowance in metres, across both tiers. Listed, not fixed here: each owner fixes theirs (or
 * declares a larger, photo-backed `userData.footprint.maxProjection`) and deletes the line. The
 * audit fails on any landmark not listed, and on a listed one that gets worse by more than 0.1 m.
 */
const KNOWN: Record<string, number> = {
  'osm:way:269747513': 471.17, // clara-meer, midtown-upper
  'osm:way:234939895': 191.88, // North Avenue station, midtown-south
  'osm:way:235006952': 96.49, // Midtown station east entrance, midtown-central
  'osm:way:245699027': 56.47, // Bobby Dodd Stadium, midtown-south
  'osm:way:28961738': 45.64, // High Museum of Art, midtown-upper
  'osm:way:42725820': 32.34, // Academy of Medicine, midtown-central
  'osm:way:269637886': 24.33, // Arts Center station, midtown-upper
  'osm:way:38977297': 19.7, // The Varsity, midtown-south
  'osm:way:714119667': 19.62, // Coda, midtown-south
  'osm:way:28979077': 15.09, // Federal Reserve Bank of Atlanta, midtown-central
  'osm:way:269637579': 6.47, // Rhodes Hall, brookwood-south
  'osm:way:886044296': 5.08, // Winship at Emory Midtown, midtown-south
  'osm:way:265351173': 4.66, // SCAD Atlanta, brookwood-south
  'osm:way:269843688': 4.12, // Electric Saturation, midtown-central
  'osm:way:269843469': 3.57, // Four Seasons Hotel, midtown-upper
  'osm:way:28961767': 3.28, // Woodruff Arts Center, midtown-upper
  'osm:way:234933267': 2.67, // Park Central, midtown-upper
  'osm:way:269542143': 2.55, // Emmi Midtown, brookwood-south
  'osm:way:208355446': 2.5, // Fox Theatre, midtown-south
  'osm:way:885667868': 2.29, // Amli Arts Center, midtown-upper
  'osm:way:505414294': 2.15, // Atlantic House, midtown-upper
  'osm:way:269542078': 2.1, // The Atlantic, brookwood-south
  'osm:way:886034013': 1.88, // Atlanta Biltmore, midtown-central
  'osm:way:536884432': 1.77, // Square on 5th, midtown-central
  'osm:way:789980819': 1.28, // Nine15 Midtown, midtown-central
  'osm:way:536670474': 0.74, // ViewPoint, midtown-central
  'osm:way:885325356': 0.49, // Wimbish House, midtown-upper
  'osm:way:269843407': 0.32, // The Campanile, midtown-upper
  'osm:way:42706709': 0.12, // Tech Tower, midtown-south
  'osm:way:234935283': 0.11, // Loews Atlanta Hotel, midtown-central
  'osm:way:1001565075': 0.11, // 1105 West Peachtree, midtown-upper
  // Downtown geometry at the time the audit was extended.
  'ef617421-bb1d-405b-848c-712d0267ff56': 5.02, // createPeachtreeCenter, downtown
  '9578af9e-4715-40b8-822a-047b4cf16d9a': 6.2, // Atlanta Central Library, downtown
  '731be9d3-8574-4c40-91dd-7940bc38067e': 4.49, // 55 Park Place, downtown
  '3b44d236-c74c-40cc-bf2b-7a42547418fe': 0.3, // Davison's department store, downtown
  '74911c46-8821-4b61-95d0-c571563d795d': 2.63, // The Ritz-Carlton, Atlanta, downtown
  'c4d0fd71-eba0-46b2-b551-1e840e220b6e': 0.05, // Bennett A. Brown Commerce Building, downtown
  'f56ffe3c-cf56-4bc0-9ed3-eefadc1d7e89': 1.06, // 100 Edgewood Avenue, downtown
  '4aa2b33a-6a07-4b7b-b274-59c6cb7fa8dd': 7.46, // 75 Piedmont · former Citizens Trust Bank, downtown
  '8ce87973-e33f-4f88-aa5d-2d557abf5bc5': 27.5, // Fulton County Government Center, downtown
  'bb792e0e-9fe2-4c92-8ee9-dd3c60fa4dbb': 4.7, // Georgia Aquarium, downtown
  '238d116b-be0d-4143-8430-7dce06763b88': 4.95, // world-of-coca-cola, downtown
  '0a4a8480-d8f4-40bf-9346-853c053cd064': 1.4, // Fulton County Courthouse, downtown
  '375da932-0e7e-4297-b010-f39110f1538c': 0.39, // Two Peachtree, downtown
  'c102d61f-1027-4d71-8024-57c8eabc3a58': 4.82, // Mercedes-Benz Stadium, downtown
  'a7661a6c-82d6-4347-98fe-f0acff8b918e': 7.42, // Centennial Park observation wheel, downtown
  'b17dc236-2262-42f8-bb5b-f4d1ad993d9a': 1.33, // Grady Memorial Hospital, downtown
  '721de634-8a32-4beb-a8d8-089afe296f1b': 4, // Atlanta City Hall, downtown
  '3ead9055-6c68-4bcc-8ea0-48aabc7892eb': 15.25, // AmericasMart, downtown
};

/**
 * Known detached clusters on main when the check landed (2026-11-24): the number of clusters
 * outside the footprint that never come within 0.3 m of the anchored building, worst tier.
 * Alexan on 8th before #550 had 214, 1.64 m off its walls; after #550 it has 4. Same ratchet: fix and delete the line; any new or extra loose
 * part fails.
 */
const KNOWN_DETACHED: Record<string, number> = {
  'osm:way:1021839184': 84, // EUHM staff deck, midtown-south, worst 0.67 m off
  'osm:way:269542143': 29, // Emmi Midtown, brookwood-south, worst 0.52 m off
  // Midtown station east entrance, midtown-central. Declared, not floating: the free-standing coffered
  // canopy on its six piers, two entrance headers on posts and two draped plaza pavings all stand on the
  // ground beside the stair house; the sixth is the end cross-rib, which crosses the long ribs (no vertex within 0.3 m).
  'osm:way:235006952': 6,
  'osm:way:886044296': 9, // Winship at Emory Midtown, midtown-south, worst 1.7 m off
  'osm:way:39450314': 9, // One Atlantic Center, midtown-upper, worst 0.67 m off
  'osm:way:208355680': 8, // Ponce de Leon Apartments, midtown-south, worst 0.34 m off
  'osm:way:28961767': 7, // Woodruff Arts Center, midtown-upper, worst 0.33 m off: under 0.5 m (fins and loggia trim), tidy later
  'osm:way:269747513': 7, // clara-meer, midtown-upper, worst 5.85 m off
  'osm:way:42725820': 6, // Academy of Medicine, midtown-central, worst 0.46 m off
  'osm:way:42792936': 4, // Crum and Forster Building, midtown-south, worst 0.42 m off: under 0.5 m (facade trim), tidy later
  // North Avenue station, midtown-south. Declared: Tower Square's three station-entrance door sets, drawn
  // 0.23 m proud of that separate building's walls, 140-200 m south of the station footprint.
  'osm:way:234939895': 3,
  'osm:way:28961738': 3, // High Museum of Art, midtown-upper, worst 1.39 m off: legitimate, the entry ramp's foot lands on the Peachtree lawn
  'osm:way:38977297': 2, // The Varsity, midtown-south, worst 7.9 m off: legitimate, the blade sign stands free on its pylon
  'osm:way:269636921': 2, // Promenade Central, midtown-upper, worst 0.88 m off
  'osm:way:28979077': 1, // Federal Reserve Bank of Atlanta, midtown-central, worst 0.6 m off
  'osm:way:269843688': 1, // Electric Saturation, midtown-central, worst 0.31 m off: legitimate, the artwork stands 0.31 m clear of the vent
  'osm:way:245699027': 1, // Bobby Dodd Stadium, midtown-south, worst 3.91 m off: legitimate, the playing field sits on the ground inside the bowl
  'osm:way:269843407': 1, // The Campanile, midtown-upper, worst 0.92 m off
  // Downtown geometry at the time the audit was extended.
  'cca22dcb-b333-4b2a-9371-869465370bda': 1, // 191 Peachtree Tower, downtown, worst 0.35 m off
  'ef617421-bb1d-405b-848c-712d0267ff56': 2, // createPeachtreeCenter, downtown, worst 1.61 m off
  '731be9d3-8574-4c40-91dd-7940bc38067e': 1, // 55 Park Place, downtown, worst 1.31 m off
  'bb792e0e-9fe2-4c92-8ee9-dd3c60fa4dbb': 3, // Georgia Aquarium, downtown, worst 0.53 m off
  '0a4a8480-d8f4-40bf-9346-853c053cd064': 2, // Fulton County Courthouse, downtown, worst 0.66 m off
  '375da932-0e7e-4297-b010-f39110f1538c': 9, // Two Peachtree, downtown, worst 0.45 m off
  '2ff341bc-095f-44d6-8360-b3b8a785295a': 200, // Museum Tower at Centennial Hill, downtown, worst 1.25 m off
  'a7661a6c-82d6-4347-98fe-f0acff8b918e': 4, // Centennial Park observation wheel, downtown, worst 1.94 m off
};

/**
 * Known coplanar layers on main when the check landed (2026-11-24): overlapping same-facing triangle
 * pairs 5 mm to 3 cm off the wall behind them, worst tier. At City's 400-600 m orbit those z-fight
 * into black teeth (International Garage's slots, #645). Same ratchet: stand the layer 4 cm or more
 * clear, then lower or delete the line; any new or extra pair fails.
 */
const KNOWN_COPLANAR: Record<string, number> = {
  'osm:way:28979077': 36520, // Federal Reserve Bank of Atlanta, midtown-central, closest 0.006 m
  'osm:way:28961738': 12390, // High Museum of Art, midtown-upper, closest 0.005 m
  'osm:way:536718218': 9784, // Coca-Cola USA Building, midtown-south, closest 0.007 m
  'osm:way:1464967906': 7840, // 1072 West Peachtree, midtown-upper, closest 0.02 m
  'osm:way:789975430': 7688, // Alexan on 8th, midtown-central, closest 0.02 m
  'osm:way:269843469': 7656, // Four Seasons Hotel, midtown-upper, closest 0.006 m
  'osm:way:269542143': 6520, // Emmi Midtown, brookwood-south, closest 0.01 m
  'osm:way:536899754': 4968, // The M by Radius, midtown-upper, closest 0.02 m
  'osm:way:269637886': 4867, // Arts Center station, midtown-upper, closest 0.005 m
  'osm:way:269391972': 4608, // Two Peachtree Pointe, brookwood-station, closest 0.02 m
  'osm:way:536728181': 4508, // Mayfair Tower Condominiums, midtown-upper, closest 0.02 m
  'osm:way:886034002': 3888, // University House, midtown-central, closest 0.03 m
  'osm:way:1344630139': 3534, // Norfolk Southern headquarters, midtown-south, closest 0.005 m
  'osm:way:886041064': 3214, // The Georgian Terrace Hotel, midtown-south, closest 0.01 m
  'osm:way:234939895': 2848, // North Avenue station, midtown-south, closest 0.005 m
  'osm:way:886034013': 2843, // Atlanta Biltmore, midtown-central, closest 0.005 m
  'osm:way:796360049': 2816, // Vireo Piedmont Park, midtown-upper, closest 0.01 m
  'osm:way:536886485': 2710, // MAA Midtown, midtown-central, closest 0.01 m
  'osm:way:536884432': 2232, // Square on 5th, midtown-central, closest 0.015 m
  'osm:way:269637571': 1838, // Arts Center bus canopy, midtown-upper, closest 0.005 m
  'osm:way:234733558': 1756, // Margaret Mitchell House, midtown-central, closest 0.01 m
  'osm:way:536885864': 1688, // Azure on the Park, midtown-central, closest 0.01 m
  'osm:way:885332250': 1562, // 1355 Peachtree, brookwood-south, closest 0.005 m
  'osm:way:234935278': 1368, // 1075 Peachtree, midtown-upper, closest 0.01 m
  'osm:way:1021839184': 1204, // EUHM staff deck, midtown-south, closest 0.01 m
  'osm:way:886036475': 1044, // 999 Peachtree, midtown-central, closest 0.03 m
  'osm:way:42725820': 1024, // Academy of Medicine, midtown-central, closest 0.006 m
  'osm:way:234933267': 944, // Park Central, midtown-upper, closest 0.02 m
  'osm:way:536740360': 904, // Colony House, midtown-upper, closest 0.02 m
  'osm:way:536895716': 828, // 77 12th Street, midtown-upper, closest 0.02 m
  'osm:way:789980819': 618, // Nine15 Midtown, midtown-central, closest 0.02 m
  'osm:way:39449840': 528, // Bank of America Plaza, midtown-south, closest 0.02 m
  'osm:way:886044296': 432, // Winship at Emory Midtown, midtown-south, closest 0.02 m
  'osm:way:28961767': 368, // Woodruff Arts Center, midtown-upper, closest 0.01 m
  'osm:way:1427534504': 366, // 1010 Midtown, midtown-upper, closest 0.02 m
  'osm:way:1001565075': 364, // 1105 West Peachtree, midtown-upper, closest 0.011 m
  'osm:way:536737549': 351, // 400 Colony Square, midtown-upper, closest 0.01 m
  'osm:way:235006952': 349, // Midtown station east entrance, midtown-central, closest 0.005 m
  'osm:way:38977297': 346, // The Varsity, midtown-south, closest 0.009 m
  'osm:way:885660351': 273, // 1180 Peachtree, midtown-upper, closest 0.005 m
  'osm:way:269747513': 245, // clara-meer, midtown-upper, closest 0.005 m
  'osm:way:245699027': 244, // Bobby Dodd Stadium, midtown-south, closest 0.005 m
  'osm:way:39450210': 240, // 1100 Peachtree, midtown-upper, closest 0.02 m
  'osm:way:269542282': 232, // 271 Seventeenth Street, brookwood-south, closest 0.02 m
  'osm:way:269637579': 228, // Rhodes Hall, brookwood-south, closest 0.005 m
  'osm:way:234935283': 182, // Loews Atlanta Hotel, midtown-central, closest 0.006 m
  'osm:way:445841094': 142, // SkyHouse South, midtown-central, closest 0.03 m
  'osm:way:269542078': 136, // The Atlantic, brookwood-south, closest 0.02 m
  'osm:way:885325356': 124, // Wimbish House, midtown-upper, closest 0.013 m
  'osm:way:1300593936': 120, // Nomia, brookwood-south, closest 0.022 m
  'osm:way:208355446': 120, // Fox Theatre, midtown-south, closest 0.008 m
  'osm:way:536737548': 64, // 100 Colony Square, midtown-upper, closest 0.02 m
  'osm:way:714119667': 56, // Coda, midtown-south, closest 0.01 m
  'osm:way:265351173': 54, // SCAD Atlanta, brookwood-south, closest 0.013 m
  'osm:way:234939892': 48, // Crowne Plaza Atlanta Midtown, midtown-south, closest 0.02 m
  'osm:way:269637575': 48, // Promenade Tower, midtown-upper, closest 0.007 m
  'osm:way:269843399': 48, // Regions Plaza, midtown-upper, closest 0.03 m
  'osm:way:270470130': 44, // 25 Pine Street NE Parking Garage, north-band, closest 0.016 m
  'osm:way:1442258925': 28, // The Registry on the Park, midtown-upper, closest 0.03 m
  'osm:way:42792936': 26, // Crum and Forster Building, midtown-south, closest 0.008 m
  'osm:way:1297223465': 22, // Midtown Union, brookwood-south, closest 0.01 m
  'osm:way:505414294': 20, // Atlantic House, midtown-upper, closest 0.01 m
  'osm:way:235006968': 16, // Midtown station west entrance, midtown-central, closest 0.02 m
  'osm:way:885667868': 14, // Amli Arts Center, midtown-upper, closest 0.03 m
  'osm:way:884939412': 12, // Ascent Midtown, brookwood-south, closest 0.03 m
  'osm:way:791413998': 12, // High Performance Computing Center, midtown-south, closest 0.007 m
  'osm:way:208355680': 10, // Ponce de Leon Apartments, midtown-south, closest 0.012 m
  'osm:way:269843688': 8, // Electric Saturation, midtown-central, closest 0.008 m
  // Downtown geometry at the time the audit was extended.
  '16cab934-34dc-4dca-8eb2-3ce9dc57d877': 32, // Westin Peachtree Plaza, downtown, closest 0.005 m
  'cca22dcb-b333-4b2a-9371-869465370bda': 32, // 191 Peachtree Tower, downtown, closest 0.025 m
  'f36a8d1a-981d-4229-bfcf-f2635e5ab028': 26, // Atlanta Marriott Marquis, downtown, closest 0.021 m
  'd36a5d7e-165d-4008-a4be-6d32c4c55f0b': 808, // Marquis One, downtown, closest 0.005 m
  '2b0270ee-9f6a-44c9-bf0d-e6fb20e6c47c': 1402, // Marquis Two, downtown, closest 0.005 m
  '51e690cd-e135-46db-9935-e4588b6b2e1f': 262, // Medical Arts Building, downtown, closest 0.010 m
  '30de017f-b8eb-4692-9674-b9db13a90288': 184, // JW Marriott Atlanta Downtown, downtown, closest 0.011 m
  '20ecbeda-7f1c-4009-b976-c005905f6e7a': 5800, // Hilton Atlanta, downtown, closest 0.025 m
  '0feb6547-009b-487f-954b-3a4f2a864df6': 307, // Hyatt Regency Atlanta and Polaris, downtown, closest 0.005 m
  'ff0016db-34f2-44b2-9f28-30bfc6c26b9c': 2984, // Twelve Centennial Park Tower I, downtown, closest 0.005 m
  'd589ba16-ac92-4a00-8386-1d8098172a80': 8960, // Truist Plaza, downtown, closest 0.011 m
  '9578af9e-4715-40b8-822a-047b4cf16d9a': 556, // Atlanta Central Library, downtown, closest 0.010 m
  '200f8a75-44d8-4a11-8ff8-6af148cc6b17': 2560, // Flatiron Building, downtown, closest 0.008 m
  'eeb07e5a-dbed-4900-9314-e478769493ca': 3220, // Healey Building, downtown, closest 0.006 m
  '53f15907-13e9-40e0-898e-bec4f841a951': 3040, // The Landmark, downtown, closest 0.020 m
  '07fa5c03-884f-4bb1-baff-b0d858f13699': 3224, // 25 Park Place, downtown, closest 0.005 m
  '731be9d3-8574-4c40-91dd-7940bc38067e': 80, // 55 Park Place, downtown, closest 0.005 m
  '57b15807-8d28-41b6-99c4-82bfb7a56eb9': 40, // 55 Marietta Street, downtown, closest 0.007 m
  '3b44d236-c74c-40cc-bf2b-7a42547418fe': 300, // Davison's department store, downtown, closest 0.010 m
  '74911c46-8821-4b61-95d0-c571563d795d': 68, // The Ritz-Carlton, Atlanta, downtown, closest 0.010 m
  'c39654db-4734-4f65-a65e-8c46ff9e1fb0': 14440, // Southern Bell Telephone Company Building, downtown, closest 0.005 m
  '85e6fb90-92d5-4178-acb4-40ed503833d4': 452, // Rhodes-Haverty Building, downtown, closest 0.010 m
  '06942e29-e032-4d6b-a30f-7e1f4bc9f2a4': 84, // Empire Building — Robinson College, downtown, closest 0.020 m
  'c4d0fd71-eba0-46b2-b551-1e840e220b6e': 391, // Bennett A. Brown Commerce Building, downtown, closest 0.007 m
  'f56ffe3c-cf56-4bc0-9ed3-eefadc1d7e89': 1115, // 100 Edgewood Avenue, downtown, closest 0.018 m
  'ae833b60-6228-4d0e-8098-ccec8a81c2f8': 2973, // The Metropolitan, downtown, closest 0.010 m
  '8823b763-1d37-44f3-b2f0-8b7de989868b': 56, // Marietta frontage at Five Points, downtown, closest 0.015 m
  '8759966e-3226-4802-be0f-28ccf249a4ff': 6836, // One12 Courtland, downtown, closest 0.005 m
  '4aa2b33a-6a07-4b7b-b274-59c6cb7fa8dd': 336, // 75 Piedmont · former Citizens Trust Bank, downtown, closest 0.010 m
  '8ce87973-e33f-4f88-aa5d-2d557abf5bc5': 768, // Fulton County Government Center, downtown, closest 0.005 m
  'bb792e0e-9fe2-4c92-8ee9-dd3c60fa4dbb': 4180, // Georgia Aquarium, downtown, closest 0.005 m
  '238d116b-be0d-4143-8430-7dce06763b88': 345, // world-of-coca-cola, downtown, closest 0.007 m
  'b13d3a92-ab62-4c26-812f-543d3597f3dc': 1736, // 250 Williams Street, downtown, closest 0.007 m
  '0a4a8480-d8f4-40bf-9346-853c053cd064': 150, // Fulton County Courthouse, downtown, closest 0.015 m
  '9bfb58f3-4fec-416b-a4e9-3b869d799cc2': 4, // William-Oliver Building, downtown, closest 0.026 m
  '74fe6c27-9599-458a-bf46-94111160bd53': 6, // Omni Atlanta Hotel at Centennial Park, downtown, closest 0.007 m
  '375da932-0e7e-4297-b010-f39110f1538c': 268, // Two Peachtree, downtown, closest 0.009 m
  'e7b9bf31-89f1-4e38-b8bd-82cab014f1fd': 54, // College Football Hall of Fame, downtown, closest 0.010 m
  '2ff341bc-095f-44d6-8360-b3b8a785295a': 4164, // Museum Tower at Centennial Hill, downtown, closest 0.020 m
  'f2448d24-91b3-4b68-9fff-c903d9c1f40c': 260, // 34 Peachtree (One Park Tower), downtown, closest 0.010 m
  '98ea45a8-aec5-4eab-b1b1-77a136c99a38': 4, // Georgia Power headquarters, downtown, closest 0.010 m
  '15576641-5f10-4b9b-b977-994a51489be1': 2412, // Georgia-Pacific Tower, downtown, closest 0.020 m
  'c102d61f-1027-4d71-8024-57c8eabc3a58': 594, // Mercedes-Benz Stadium, downtown, closest 0.005 m
  'e10bc2d8-2376-4e1b-969c-4eca7a3f2eb4': 116, // Richard B. Russell Federal Building, downtown, closest 0.009 m
  '0f60407e-dc16-401f-8371-d8daed2807f1': 178, // Centennial Tower (101 Marietta), downtown, closest 0.010 m
  'a7661a6c-82d6-4347-98fe-f0acff8b918e': 1034, // Centennial Park observation wheel, downtown, closest 0.007 m
  '7c9beafb-b0fd-48e0-a815-a6daa864a0db': 64, // Georgia State Capitol, downtown, closest 0.020 m
  '46ba7ea2-3735-47a8-b77d-997b486ea866': 140, // Georgia World Congress Center, downtown, closest 0.007 m
  '274e7277-5fe9-4a57-9e5c-01a6e6458c8a': 1036, // State Farm Arena, downtown, closest 0.006 m
  'b17dc236-2262-42f8-bb5b-f4d1ad993d9a': 18, // Grady Memorial Hospital, downtown, closest 0.008 m
  '34e844fe-1076-4a70-b533-650c8f36085d': 142, // Candler Building and 113 Peachtree storefront, downtown, closest 0.010 m
  'e14e24d5-1e78-423b-baec-0529477c10a2': 310, // 100 Peachtree (Equitable Building), downtown, closest 0.007 m
  '721de634-8a32-4beb-a8d8-089afe296f1b': 1104, // Atlanta City Hall, downtown, closest 0.005 m
  '3ead9055-6c68-4bcc-8ea0-48aabc7892eb': 229, // AmericasMart, downtown, closest 0.008 m
  'a7e88f9b-fa39-42c0-9804-9117c9cf8a7c': 48, // Hurt Building, downtown, closest 0.020 m
};

function stubCanvas() {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  vi.stubGlobal('Path2D', class {});

}

function checkRatchets(results: Failure[]) {
  const worst = new Map<string, Failure>(), loose = new Map<string, Failure>(), flat = new Map<string, Failure>();
  for (const r of results) {
    const key = r.id.split(' ')[0];
    if (!worst.has(key) || r.worst + r.vertical > worst.get(key)!.worst + worst.get(key)!.vertical) worst.set(key, r);
    if (r.detached && (!loose.has(key) || r.detached > loose.get(key)!.detached)) loose.set(key, r);
    if (r.coplanar.pairs > (flat.get(key)?.coplanar.pairs ?? 0)) flat.set(key, r);
  }
  const failing = [...worst.entries()].filter(([, r]) => r.worst > 0 || r.vertical > 0);
  if (process.env.FOOTPRINT_REPORT) console.log('FOOTPRINT', JSON.stringify(failing.map(([, r]) => r)));
  if (process.env.FOOTPRINT_REPORT) console.log('DETACHED', JSON.stringify([...loose.values()]));
  if (process.env.FOOTPRINT_REPORT) console.log('COPLANAR', JSON.stringify([...flat.values()].map(({ id, board, coplanar }) => ({ id, board, ...coplanar }))));
  const unexpected = failing
    .filter(([id, r]) => !(id in KNOWN) || r.worst + r.vertical > KNOWN[id] + 0.1)
    .map(([, r]) => `${r.id} on ${r.board}: ${r.worst} m past the allowance (${r.outside} m outside the outline) at ${r.at.join(', ')}` + (r.vertical ? `, ${r.vertical} m past top/bottom` : ''));
  const unexpectedLoose = [...loose.entries()]
    .filter(([id, r]) => r.detached > (KNOWN_DETACHED[id] ?? 0))
    .map(([, r]) => `${r.id} on ${r.board}: ${r.detached} part(s) not touching the wall, worst ${r.detachedGap} m off it at ${r.detachedAt.join(', ')}`);
  const unexpectedFlat = [...flat.entries()]
    .filter(([id, r]) => r.coplanar.pairs > (KNOWN_COPLANAR[id] ?? 0))
    .map(([, r]) => `${r.id} on ${r.board}: ${r.coplanar.pairs} layer pair(s) under 3 cm off their wall, closest ${r.coplanar.worst?.gap.toFixed(3)} m at ${r.coplanar.worst?.at.map(v => v.toFixed(1)).join(', ')}`);
  expect([...unexpected, ...unexpectedLoose, ...unexpectedFlat]).toEqual([]);
}

it('keeps downtown landmarks within footprint, detachment and layer limits', async () => {
  stubCanvas();
  checkRatchets(await auditDowntown());
}, 600_000);

it('keeps square-board landmarks within footprint, detachment and layer limits', () => {
  stubCanvas();
  const results = (['high', 'low'] as const).flatMap(quality => boards.flatMap(board => auditBoard(board, quality)));
  expect(results.length).toBeGreaterThan(150); // both tiers of every board's landmarks
  checkRatchets(results);
}, 600_000);
