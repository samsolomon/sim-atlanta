import { Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createPeachtreeCenter } from './peachtree-center';

// Independent samples from the downtown Overture bake, including its extra collinear vertices.
const [north, south, international, harris]: VBuilding[] = [
  {
    id: '2fcbd70e-1d1d-4690-9092-191ba41c54be',
    h: 101.0,
    floors: 27,
    rings: [
      [
        [383.64, -727.28],
        [450.22, -726.19],
        [450.38, -736.17],
        [449.51, -736.19],
        [449.53, -737.6],
        [456.82, -737.48],
        [456.98, -747.12],
        [440.22, -747.41],
        [393.08, -748.25],
        [389.85, -748.25],
        [389.69, -738.89],
        [391.04, -738.87],
        [391.0, -736.63],
        [383.79, -736.76],
        [383.7, -731.52],
        [383.66, -728.36],
      ],
    ],
  },
  {
    id: 'c934a398-eff1-4ede-98ba-ffc5045f9949',
    h: 101.0,
    floors: 27,
    rings: [
      [
        [389.21, -696.23],
        [389.08, -686.46],
        [437.89, -685.83],
        [456.46, -685.58],
        [456.59, -695.2],
        [448.98, -695.3],
        [449.01, -697.25],
        [450.43, -697.23],
        [450.56, -706.67],
        [383.39, -707.56],
        [383.27, -698.19],
        [390.42, -698.1],
        [390.39, -696.21],
      ],
    ],
  },
  {
    id: 'd1108a48-5c60-4872-b593-fb4444f84440',
    h: 115.0,
    floors: 30,
    rings: [
      [
        [500.72, -675.49],
        [500.83, -685.31],
        [459.27, -685.75],
        [459.15, -674.75],
        [445.09, -674.9],
        [444.99, -665.05],
        [447.12, -665.02],
        [446.92, -654.52],
        [475.81, -654.25],
        [477.62, -654.23],
        [499.94, -653.99],
        [500.04, -664.26],
        [502.03, -664.25],
        [502.13, -673.93],
        [499.16, -673.96],
        [499.18, -675.5],
      ],
    ],
  },
  {
    id: '1bc229b3-76a6-4e34-abf0-ff9cf0d5b6d3',
    h: 116.0,
    floors: 31,
    rings: [
      [
        [460.85, -747.22],
        [501.38, -746.55],
        [501.39, -746.86],
        [501.44, -750.01],
        [501.55, -756.77],
        [503.55, -756.74],
        [503.71, -766.38],
        [500.55, -766.43],
        [500.58, -768.06],
        [501.68, -768.04],
        [501.74, -775.11],
        [501.77, -776.98],
        [462.24, -777.71],
        [449.06, -777.95],
        [448.87, -767.17],
        [446.79, -767.21],
        [446.64, -757.81],
        [461.02, -757.57],
      ],
    ],
  },
];
const zero = 315;
const grid = new GroundGrid(
  {
    version: 1,
    rows: 2,
    cols: 2,
    stepM: 200,
    bounds: { minX: 350, maxX: 550, minZ: -800, maxZ: -600 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: zero },
    scaleM: 1,
    offsetM: 0,
    noData: -32768,
    sha256: '',
  },
  new Int16Array(4).fill(317).buffer,
);

it('places each mirrored roof step on the side measured in the point cloud', () => {
  const site = createPeachtreeCenter([harris, south, international, north], grid)!;
  expect(site.buildings).toEqual([]);
  site.group.updateMatrixWorld(true);
  const height = (x: number, z: number) => {
    const ray = new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0));
    return ray.intersectObject(site.group)[0].point.y + zero;
  };
  // Samples in the wing roof fields and inside the raised plant enclosures.
  for (const z of [-742, -691]) expect(height(420, z)).toBeCloseTo(405.5, 1);
  for (const z of [-731, -702]) expect(height(419, z)).toBeCloseTo(416.6, 1);
  for (const z of [-772, -752, -680, -658]) expect(height(478, z)).toBeCloseTo(419.2, 1);
  for (const z of [-762, -669]) expect(height(477, z)).toBeCloseTo(430.2, 1);
  const faces = site.group.children.map((g) => (g.children[1] as Mesh).material as MeshLambertMaterial);
  expect(new Set(faces).size).toBe(1);
  expect(faces[0].emissiveIntensity).toBe(0);
  site.setNight(1);
  expect(faces[0].emissiveIntensity).toBeGreaterThan(0);
});

it('keeps each unverified footprint independently in the generic pass', () => {
  const neighbor = { ...harris, id: 'd36a5d7e-165d-4008-a4be-6d32c4c55f0b' };
  const changed = { ...south, rings: north.rings };
  const hole = { ...harris, rings: [...harris.rings, harris.rings[0]] };
  const partialGrid = Object.create(grid) as GroundGrid;
  partialGrid.sample = (x, z) => (z < -735 ? null : grid.sample(x, z));
  const original = [north, neighbor, international, changed, hole];
  const result = createPeachtreeCenter(original, partialGrid)!;
  expect(result.buildings).toEqual([north, neighbor, changed, hole]);
  expect(result.group.children.map((g) => g.name)).toEqual(['Peachtree Center International Tower']);
  expect(createPeachtreeCenter([changed, hole, neighbor], grid)).toBeNull();
});

it('matches the Overture hotel, places its public sculpture on the approach and lights the lobby', () => {
  const hotel: VBuilding = {
    id: 'ef617421-bb1d-405b-848c-712d0267ff56', h: 115, floors: 31,
    rings: [[[338.41,-680.19],[349.72,-679.82],[349.91,-691.31],[350.68,-691.3],[350.81,-700.42],
      [348.73,-700.45],[348.89,-711.75],[295.88,-712.48],[295.75,-703.05],[296.73,-703.04],
      [296.71,-701.55],[293.94,-701.6],[293.79,-691.67],[308.64,-691.44],[308.62,-690.59],
      [307.59,-690.6],[307.48,-680.45]]],
  };
  const local = new GroundGrid({...grid.manifest, bounds: {minX:200, maxX:400, minZ:-800,maxZ:-600}},
    new Int16Array(4).fill(326).buffer);
  const site = createPeachtreeCenter([hotel], local)!;
  expect(site.buildings).toEqual([]);
  const tower = site.group.getObjectByName('230 Peachtree')!;
  site.group.updateMatrixWorld(true);
  const ray = new Raycaster(new Vector3(356.9, 200, -697.8), new Vector3(0,-1,0));
  expect(ray.intersectObject(tower)[0].point.y).toBeGreaterThan(11 + 4);
  const lobby = (tower.children[2] as Mesh).material as MeshLambertMaterial;
  expect(lobby.emissiveIntensity).toBe(0);
  site.setNight(1);
  expect(lobby.emissiveIntensity).toBeGreaterThan(0);
});
