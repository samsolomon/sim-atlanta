import { Color, Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { expect, it } from 'vitest';
import { World, type VBuilding, type VData } from './world';
import { Builder, pointInRing, segDist, type P2 } from './geom';

import { appendParkedSedan } from './parked-sedan';

const butler: VBuilding = {
  id: '72f23ef4-84a0-4567-9af7-4478de81418f',
  cls: 'parking',
  floors: 3,
  h: 12.5,
  rings: [
    [
      [859.01, 347.76],
      [782.73, 281.53],
      [773.2, 273.26],
      [696.53, 360.78],
      [769.89, 425.64],
      [773.24, 421.82],
      [777.64, 425.71],
      [787.66, 421.87],
      [790.24, 418.95],
      [792.55, 420.7],
      [803.28, 411.6],
      [827.77, 383.55],
      [853.1, 354.53],
    ],
  ],
};
const hackney: VBuilding = {
  id: '8f620b71-89f0-439f-8edd-d03cee0fe93f',
  cls: 'parking',
  floors: 6,
  h: 16.0156,
  rings: [
    [
      [712.47, 485.67],
      [723.37, 495.25],
      [762.59, 450.7],
      [686.91, 384.06],
      [686.29, 384.77],
      [680.57, 379.73],
      [676.34, 384.52],
      [678.8, 386.69],
      [637.74, 433.33],
      [635.46, 431.31],
      [624.51, 443.76],
      [630.98, 449.45],
      [634.95, 444.94],
      [636.76, 446.54],
      [662.18, 468.92],
      [665.33, 465.34],
      [676.83, 475.47],
      [683.9, 467.45],
      [709.03, 489.58],
    ],
  ],
};

const bounds = { minX: 600, maxX: 880, minZ: 250, maxZ: 510 };
function build(buildings: VBuilding[], ground: VData['ground'] = []) {
  const w = new World({ bounds, buildings, ground, roads: [], rail: [] }, null, {
    terrain: 'flat',
    clumps: 1,
    lightMapMax: 256,
  });
  w.buildBuildings(() => -17);
  return w.group.children[0] as Mesh<BufferGeometry>;
}

it.each([butler, hackney])('keeps the surveyed footprint, base and roof of $id in the shared batch', (building) => {
  const g = build([building]).geometry;
  expect(new Set(g.getAttribute('aStyle').array)).toEqual(new Set([-1]));
  const ring = building.rings[0];
  const pos = g.getAttribute('position');
  expect(pos.count / 3).toBeLessThan(19000);
  g.computeBoundingBox();
  expect(g.boundingBox!.min.y).toBeCloseTo(-17.5);
  expect(g.boundingBox!.max.y).toBeCloseTo(-17 + building.h! + 1.42);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i);
    if (pointInRing(x, z, ring)) continue;
    // Adjacent face normals can diverge at a kink. The outer silhouette stays on the ring.
    const distance = Math.min(...ring.map((p, j) => segDist(x, z, p, ring[(j + 1) % ring.length])));
    if (distance > 0.02) throw new Error(`Deck crosses the footprint by ${distance} m at ${x}, ${z}`);
  }
});

it('sets the parking interior back behind the concrete slab edge', () => {
  const mesh = build([butler]);
  const [start, end] = butler.rings[0];
  const along = new Vector3(end[0] - start[0], 0, end[1] - start[1]).normalize();
  const normal = new Vector3(-along.z, 0, along.x);
  const wall = new Vector3(start[0], 0, start[1]).addScaledVector(along, 4);
  if (pointInRing(wall.x + normal.x, wall.z + normal.z, butler.rings[0])) normal.negate();
  function depth(h: number) {
    const eye = wall.clone().addScaledVector(normal, 5);
    eye.y = -17 + h;
    return new Raycaster(eye, normal.clone().negate()).intersectObject(mesh)[0].distance;
  }
  expect(depth(0.7)).toBeCloseTo(5);
  expect(depth(2)).toBeCloseTo(6.2);
  expect(depth(butler.h! + 1.05)).toBeCloseTo(5);
});

it('leaves the sloping approaches open through the Hackney roof', () => {
  const mesh = build([hackney]);
  const ring = hackney.rings[0];
  const xs = ring.map(([x]) => x),
    zs = ring.map(([, z]) => z);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2,
    cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const axis = (41 * Math.PI) / 180;
  const pitch = hackney.h! / 5;
  for (const u of [-16, 24]) {
    for (const v of [-7, 0, 7]) {
      const origin = new Vector3(
        cx + Math.cos(axis) * u - Math.sin(axis) * v,
        30,
        cz + Math.sin(axis) * u + Math.cos(axis) * v
      );
      const hit = new Raycaster(origin, new Vector3(0, -1, 0)).intersectObject(mesh)[0];
      expect(hit.point.y).toBeCloseTo(-17 + hackney.h! - (pitch * (10.5 - v)) / 21, 3);
    }
  }
});

it('preserves the ordinary facade on unverified buildings and keeps surface lots out of the building batch', () => {
  for (const b of [
    { ...butler, cls: 'hospital' },
    { ...butler, id: 'other-deck' },
  ]) {
    expect(Math.max(...build([b]).geometry.getAttribute('aStyle').array)).toBeGreaterThanOrEqual(0);
  }
  const rings: P2[][] = butler.rings;
  expect(build([], [{ kind: 'parking', name: null, sub: null, rings }]).geometry.getAttribute('position').count).toBe(
    0
  );
});

it('places four tires on the pavement and preserves the parked sedan sill and roof heights', () => {
  const parked = new Builder();
  const pavement = 6.5;
  appendParkedSedan(parked, [0, 0], pavement, 1, 0, '#fff');
  const contacts = new Set<string>();
  const shell: number[] = [];
  for (let i = 0; i < parked.pos.length; i += 3) {
    const [x, y, z] = parked.pos.slice(i, i + 3);
    expect(y).toBeGreaterThanOrEqual(pavement);
    if (y === pavement) {
      expect(Math.abs(z)).toBeGreaterThan(0.7);
      expect(Math.abs(Math.abs(x) - 1.457)).toBeLessThan(0.15);
      contacts.add([Math.sign(x), Math.sign(z)].join(','));
    }
    if (parked.col[i] === 1) shell.push(y - pavement);
  }
  expect(contacts.size).toBe(4);
  expect(Math.min(...shell)).toBeCloseTo(0.32);
  expect(Math.max(...shell)).toBeCloseTo(1.42);
});

const piedmont: VBuilding = {
  id: '725df320-8835-4d58-8bac-b2deca3b5fdc',
  h: 18.792861938476562,
  floors: null,
  cls: 'parking',
  rings: [
    [
      [801.7, 146.79],
      [840.58, 102.03],
      [781.34, 50.07],
      [742.46, 94.83],
    ],
  ],
};
const mDeck: VBuilding = {
  id: '1cb420c3-3cc0-4bad-9909-235620d77f61',
  h: 25.7,
  floors: null,
  cls: 'parking',
  rings: [
    [
      [690.46, 121.41],
      [744.82, 58.22],
      [704.39, 23.41],
      [681.95, 49.18],
      [650.04, 85.83],
    ],
  ],
};

it.each([
  { building: piedmont, height: 28, carsMin: 7, carsMax: 40, finish: '#a5866c' },
  { building: mDeck, height: 22, carsMin: 1, carsMax: 10, finish: '#677f83' },
])('uses the measured roof and verified finish on $building.id', ({ building, height, carsMin, carsMax, finish }) => {
  const mesh = build([building]),
    g = mesh.geometry;
  const positions = g.getAttribute('position'),
    colours = g.getAttribute('color');
  const roof = -17 + height,
    tire = new Color('#242528'),
    facade = new Color(finish);
  const contacts = new Set<string>();
  let hasFinish = false;
  for (let i = 0; i < positions.count; i++) {
    const r = colours.getX(i),
      green = colours.getY(i),
      b = colours.getZ(i);
    hasFinish ||= Math.abs(r - facade.r) + Math.abs(green - facade.g) + Math.abs(b - facade.b) < 1e-5;
    if (Math.abs(r - tire.r) + Math.abs(green - tire.g) + Math.abs(b - tire.b) < 1e-5 && positions.getY(i) === roof) {
      contacts.add(positions.getX(i) + ',' + positions.getZ(i));
    }
  }
  // Each parked sedan has two outer sidewall points on the pavement at each of four tires.
  expect(contacts.size / 8).toBeGreaterThanOrEqual(carsMin);
  expect(contacts.size / 8).toBeLessThanOrEqual(carsMax);
  expect(hasFinish).toBe(true);
  const ring = building.rings[0];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      z = positions.getZ(i);
    if (!pointInRing(x, z, ring)) {
      const distance = Math.min(...ring.map((v, j) => segDist(x, z, v, ring[(j + 1) % ring.length])));
      if (distance > 0.02) throw new Error('Campus deck crosses its source footprint');
    }
  }
});

it('leaves the adjoining Correll Pavilion in the ordinary building batch', () => {
  const correll = { ...piedmont, id: 'c99d5a4d-78c0-4dee-a9ad-d5122fea8f8b' };
  expect(Math.max(...build([correll]).geometry.getAttribute('aStyle').array)).toBeGreaterThanOrEqual(0);
});

const steelDecks: (VBuilding & { name: string })[] = [
  {
    id: 'bdaf3eb3-d438-414b-8fb3-4ca8fff3b752',
    h: 14.6,
    floors: 5,
    cls: 'parking',
    name: 'S Deck',
    rings: [
      [
        [743.01, 277.41],
        [780.32, 234.29],
        [752.64, 210.6],
        [715.57, 253.48],
      ],
    ],
  },
  {
    id: '1ac40424-9462-48ad-b897-d260ca57dd38',
    h: 18.4,
    floors: 7,
    cls: 'parking',
    name: 'K Deck',
    rings: [
      [
        [728.16, 282.45],
        [726.21, 284.87],
        [704.14, 266.31],
        [651.66, 326.17],
        [655.09, 328.97],
        [657.02, 327.43],
        [679.25, 346.71],
        [732.26, 285.98],
      ],
    ],
  },
  {
    id: '99b12a07-cc31-4357-bbd6-28e528f5e8a8',
    h: 18.2,
    floors: 7,
    cls: 'parking',
    name: 'N Deck',
    rings: [
      [
        [694.67, 256.92],
        [672.51, 238.14],
        [619.9, 298.17],
        [623.66, 301.66],
        [625.88, 299.44],
        [648.22, 319.0],
        [700.8, 258.86],
        [696.42, 255.15],
      ],
    ],
  },
];

it.each(steelDecks)('keeps $name inside its own footprint and seats all four tires on the surveyed grades', (deck) => {
  const mesh = build([deck]);
  const g = mesh.geometry,
    pos = g.getAttribute('position'),
    colour = g.getAttribute('color');
  const ring = deck.rings[0],
    tire = new Color('#242528');
  const axis = (41 * Math.PI) / 180,
    c = Math.cos(axis),
    s = Math.sin(axis);
  const cx = (Math.min(...ring.map((p) => p[0])) + Math.max(...ring.map((p) => p[0]))) / 2;
  const cz = (Math.min(...ring.map((p) => p[1])) + Math.max(...ring.map((p) => p[1]))) / 2;
  const top = -17 + deck.h!;
  const split = deck.name === 'S Deck';
  const pavement = (u: number, v: number) => {
    if (split) return top + (u < 0 ? 0.022 * (v - 28) : -1.23 - 0.022 * (28 + v));
    const upper = top - ((deck.name === 'K Deck' ? 1.27 : 1.33) * Math.max(0, Math.min(30, Math.abs(v)) - 3)) / 27;
    const ramp = Math.abs(u) < 15 && u * v > 0 && Math.abs(v) > 3 && Math.abs(v) < 30;
    return upper - (ramp ? ((deck.name === 'K Deck' ? 2.62 : 2.66) * (30 - Math.abs(v))) / 27 : 0);
  };
  // Test both sides of the central split at two stations, including both lower ramps.
  for (const u of [-8, 8])
    for (const v of [-17, 17]) {
      const origin = new Vector3(cx + c * u - s * v, 30, cz + s * u + c * v);
      const hit = new Raycaster(origin, new Vector3(0, -1, 0)).intersectObject(mesh)[0];
      expect(hit.point.y).toBeCloseTo(pavement(u, v), 2);
    }
  const contacts = new Set<string>();
  let tireVertices = 0;
  const pavementColour = new Color('#b0afab');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i),
      y = pos.getY(i);
    if (
      !pointInRing(x, z, ring) &&
      Math.min(...ring.map((p, j) => segDist(x, z, p, ring[(j + 1) % ring.length]))) > 0.02
    )
      throw new Error(deck.name + ' extends past its surveyed perimeter');
    if (
      Math.abs(colour.getX(i) - tire.r) + Math.abs(colour.getY(i) - tire.g) + Math.abs(colour.getZ(i) - tire.b) >
      1e-5
    )
      continue;
    tireVertices++;
    const u = (x - cx) * c + (z - cz) * s,
      v = -(x - cx) * s + (z - cz) * c;
    const above = y - pavement(u, v);
    if (above < -0.001) throw new Error('Sunken tire');
    const key = x + ',' + z;
    if (above < 0.001 && !contacts.has(key)) {
      const hits = new Raycaster(new Vector3(x, y + 0.5, z), new Vector3(0, -1, 0)).intersectObject(mesh);
      // Find the actual upper parking pavement under the contact patch. A tire
      // over either lower circulation ramp cannot satisfy this check.
      const pavementHit = hits.find(({ face }) => face && Math.abs(colour.getX(face.a) - pavementColour.r) < 1e-6);
      expect(pavementHit?.point.y).toBeCloseTo(y, 3);
      contacts.add(key);
    }
  }
  const cars = contacts.size / 8;
  expect(cars).toBe(tireVertices / 72);
  expect(Number.isInteger(cars)).toBe(true);
  expect(cars).toBeGreaterThanOrEqual(1);
  expect(cars).toBeLessThanOrEqual(split ? 4 : deck.name === 'K Deck' ? 4 : 10);
});

it('uses the surveyed garage roof at 191 Peachtree despite the neighboring tower returns', () => {
  const garage: VBuilding = {
    ...butler,
    id: '10389dea-9cd3-4d48-afe6-c077296e0724',
    floors: 8,
    h: 198.3,
    rings: [[[441.81,-549.45],[441.23,-512.87],[447.98,-512.70],[465.09,-512.28],
      [500.55,-511.40],[500.55,-548.96],[491.49,-548.84],[486.80,-548.90],[455.76,-549.28]]],
  };
  const geometry = build([garage]).geometry;
  geometry.computeBoundingBox();
  const heights = geometry.getAttribute('position');
  let roofVertices = 0;
  for (let i = 0; i < heights.count; i++) {
    if (Math.abs(heights.getY(i) - (-17 + 31.6)) < 0.001) roofVertices++;
  }
  expect(roofVertices).toBeGreaterThan(12);
  expect(geometry.boundingBox!.max.y).toBeCloseTo(-17 + 31.6 + 2.4);
});
