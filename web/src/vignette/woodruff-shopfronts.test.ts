import { Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { expect, it } from 'vitest';
import type { P2 } from './geom';
import { World, type VBuilding } from './world';

const lots: [string, number, P2[]][] = [
  [
    'f472648e-f73e-4031-86f4-d8d6885ba239',
    14.8,
    [
      [218.18, -196.95],
      [234.59, -177.75],
      [241.53, -193.56],
      [226.33, -211.33],
      [214.52, -201.24],
    ],
  ],
  [
    '5bf06764-7551-4ae7-9442-88f6eb1fa43d',
    13.1,
    [
      [212.93, -192.45],
      [231.28, -171.11],
      [234.59, -177.75],
      [218.18, -196.95],
    ],
  ],
  [
    '2a99a93b-d963-4348-8792-a489cf3e4697',
    16.6,
    [
      [209.36, -196.03],
      [202.94, -190.77],
      [226.88, -162.36],
      [231.28, -171.11],
      [212.93, -192.45],
    ],
  ],
  [
    '2298c49e-cf23-4617-8ba9-cf2899b46d66',
    15.5,
    [
      [199.56, -181.69],
      [222.66, -154.28],
      [226.88, -162.36],
      [202.94, -190.77],
      [196.49, -185.33],
    ],
  ],
  [
    'c57236ea-b41d-49e7-88a5-32015b8830e0',
    13.5,
    [
      [192.74, -175.87],
      [218.46, -145.83],
      [222.66, -154.28],
      [199.56, -181.69],
    ],
  ],
];
const buildings = lots.map(([id, h, ring]) => ({ id, h, floors: null, rings: [ring] }));
function build(records: VBuilding[]) {
  const world = new World(
    {
      bounds: { minX: 180, maxX: 260, minZ: -220, maxZ: -140 },
      buildings: records,
      ground: [],
      rail: [],
      roads: [],
    },
    null,
    { terrain: 'flat', clumps: 1, lightMapMax: 256 },
  );
  world.buildBuildings(() => -7);
  return world.group.children[0] as Mesh<BufferGeometry>;
}

it('batches all six storefronts with matching vertex attributes, leaving their Broad Street walls generic', () => {
  for (const record of buildings) {
    const g = build([record]).geometry;
    const pos = g.getAttribute('position'),
      styles = g.getAttribute('aStyle');
    expect(styles.count).toBe(pos.count);
    expect(g.getAttribute('aBase').count).toBe(pos.count);
    expect(new Set(styles.array)).toContain(-2);
    expect(Array.from(styles.array).some((v) => v >= 0)).toBe(true);
    // All lit panes are at street level.
    for (let i = 0; i < styles.count; i++)
      if (styles.getX(i) === -2) expect(pos.getY(i)).toBeLessThan(-7 + 4.4);
  }
});

it('recesses the P64 window behind its masonry jamb in either ring winding', () => {
  const p64 = buildings[1];
  for (const ring of [p64.rings[0], [...p64.rings[0]].reverse()]) {
    const mesh = build([{ ...p64, rings: [ring] }]);
    const [a, b] = p64.rings[0].slice(1, 3);
    const along = new Vector3(b[0] - a[0], 0, b[1] - a[1]).normalize();
    const outward = new Vector3(-along.z, 0, along.x);
    function distance(u: number) {
      const eye = new Vector3(a[0], 1, a[1]).addScaledVector(along, u).addScaledVector(outward, 2);
      return new Raycaster(eye, outward.clone().negate()).intersectObject(mesh)[0].distance;
    }
    expect(distance(0.12)).toBeCloseTo(2);
    expect(distance(0.65)).toBeCloseTo(2.18);
  }
});

it('retains generic walls for another ID or a rebake moving the identified frontage', () => {
  const original = buildings[0];
  for (const b of [
    { ...original, id: 'other', h: 43 },
    { ...original, rings: [original.rings[0].map(([x, z]): P2 => [x + 2, z])] },
  ]) {
    expect(new Set(build([b]).geometry.getAttribute('aStyle').array)).not.toContain(-2);
  }
});
