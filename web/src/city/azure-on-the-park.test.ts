import { BufferGeometry, Color, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { azureOnTheParkId, createAzureOnThePark } from './azure-on-the-park';

// The staged midtown-central footprint of osm:way:536885864.
const site: VBuilding = {
  id: azureOnTheParkId,
  h: 98,
  floors: 5,
  rings: [[
    [966.1, -3226.5], [966.1, -3224.5], [956.4, -3224.5], [956.4, -3225.3], [911.0, -3225.3], [911.0, -3205.2],
    [956.7, -3205.2], [956.7, -3204.1], [960.6, -3204.1], [960.6, -3206.2], [966.2, -3206.2], [966.2, -3204.1],
    [970.9, -3204.1], [971.0, -3177.3], [1033.2, -3177.4], [1041.4, -3199.9], [1047.4, -3217.0], [1050.2, -3218.4],
    [1051.7, -3222.1], [1050.4, -3225.2], [1046.1, -3226.8], [1042.9, -3226.2], [972.7, -3226.5],
  ]],
};
// Flat ground at 280 m NAVD88.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 500, maxX: 1500, minZ: -3700, maxZ: -2700 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2800).buffer,
);

const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('puts the tower, its east step and the podium at their lidar roofs', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(createAzureOnThePark([other], grid, 'low')).toBeNull();
  for (const tier of ['low', 'high'] as const) {
    const result = createAzureOnThePark([other, site], grid, tier)!;
    expect(result.buildings).toEqual([other]);
    result.group.updateMatrixWorld(true);
    const top = (x: number, z: number) =>
      new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
    expect(top(915, -3208)).toBeCloseTo(361, 1); // tower parapet
    expect(top(962, -3215)).toBeCloseTo(348.9, 1); // east step
    expect(top(1000, -3200)).toBeCloseTo(297.5, 1); // podium
  }
});

it('keeps the low tier lean with a stable night pattern', () => {
  const low = createAzureOnThePark([site], grid, 'low')!;
  const again = createAzureOnThePark([site], grid, 'low')!;
  const high = createAzureOnThePark([site], grid, 'high')!;
  // The corner balcony slabs (8 stacks of 19 rows, a top and a nose each; the east face's start
  // above the step) are the only low-tier addition since #546: 405 -> 877 triangles.
  expect(triangles(low.group)).toBeLessThan(950);
  // Low keeps the corner slabs, so the ratio fell from about 12x (#546) to about 4.8x.
  expect(triangles(high.group)).toBeGreaterThan(triangles(low.group) * 4);
  const lamps = (g: typeof low) => g.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>;
  expect(lamps(low).geometry.attributes.position.array).toEqual(lamps(again).geometry.attributes.position.array);
  low.setNight(1);
  expect(lamps(low).material.emissiveIntensity).toBeCloseTo(0.66);
});

it('wraps the main tower corners in balcony stacks on both tiers', () => {
  const nose = new Color('#f2f3f2');
  for (const quality of ['low', 'high'] as const) {
    const { group } = createAzureOnThePark([site], grid, quality)!;
    group.updateMatrixWorld(true);
    const body = group.children[0] as Mesh;
    const position = body.geometry.attributes.position, color = body.geometry.attributes.color;
    const v = new Vector3(), corners = new Set<string>(), noses: Vector3[] = [];
    for (let i = 0; i < position.count; i++) {
      if (Math.abs(color.getX(i) - nose.r) + Math.abs(color.getY(i) - nose.g) + Math.abs(color.getZ(i) - nose.b) > 0.01) continue;
      v.fromBufferAttribute(position, i).applyMatrix4(body.matrixWorld);
      // Every nose sits within 6 m of one of the tower's four corners (x 911 or 956, z -3225 or -3205).
      const cx = Math.abs(v.x - 911) < 6 ? 'w' : Math.abs(v.x - 956.4) < 6 ? 'e' : null;
      const cz = Math.abs(v.z + 3225.3) < 6 ? 's' : Math.abs(v.z + 3205.2) < 6 ? 'n' : null;
      expect(cx && cz).toBeTruthy();
      corners.add(cz! + cx!);
      noses.push(v.clone());
    }
    expect([...corners].sort()).toEqual(['ne', 'nw', 'se', 'sw']);
    // The slabs turn each corner: a nose reaches the outer point 1.72 m out from both faces.
    for (const [x, z, sx, sz] of [[911, -3225.3, -1, -1], [956.4, -3225.3, 1, -1], [956.4, -3205.2, 1, 1], [911, -3205.2, -1, 1]]) {
      const reach = Math.min(...noses.map(p => Math.hypot(p.x - x - sx * 1.72, p.z - z - sz * 1.72)));
      expect(reach, `${x},${z}`).toBeLessThan(.15);
    }
  }
});
