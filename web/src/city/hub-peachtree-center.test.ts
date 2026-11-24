import { BufferGeometry, Color, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createHubPeachtreeCenter, hubPeachtreeCenterId } from './hub-peachtree-center';

// The staged downtown footprint.
const site = {"id":"ec83a792-f5f6-446e-9424-26858da5640e","h":32.6,"floors":null,"cls":"retail","name":"The Hub at Peachtree Center","rings":[[[501.39,-689.55],[502.21,-742.06],[470.39,-742.56],[470.3,-736.68],[463.18,-728.91],[463,-704.9],[468.83,-697.04],[468.72,-690.05]]]} as VBuilding;
// Flat ground at 316.3 m NAVD88 (the lidar ground ring).
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -1000, maxZ: 0 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3163).buffer,
);
const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('sets the roof at the lidar height and paints it with the waves', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  const result = createHubPeachtreeCenter([other, site], grid)!;
  expect(site.id).toBe(hubPeachtreeCenterId);
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const hit = (x: number, z: number) => new Raycaster(new Vector3(x, 250, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0];
  expect(hit(475, -700).point.y + 300).toBeCloseTo(316.3 + 29.9, 0);
  // A line across the roof meets both the white roof and the pale-blue waves.
  const wave = new Color('#8db3cf'), white = new Color('#eef0ee');
  const seen = new Set<string>();
  for (let z = -740; z <= -692; z += 0.5) {
    const h = hit(486, z), mesh = h.object as Mesh, c = mesh.geometry.attributes.color;
    const rgb = new Color(c.getX(h.face!.a), c.getY(h.face!.a), c.getZ(h.face!.a));
    const near = (k: Color) => Math.abs(rgb.r - k.r) + Math.abs(rgb.g - k.g) + Math.abs(rgb.b - k.b) < 0.01;
    if (near(wave)) seen.add('wave');
    if (near(white)) seen.add('white');
  }
  expect([...seen].sort()).toEqual(['wave', 'white']);
});

it('lights the plaza atrium at night and stays inside the landmark budget', () => {
  const result = createHubPeachtreeCenter([site], grid)!;
  expect(result.group.children).toHaveLength(2);
  expect(triangles(result.group)).toBeLessThan(600); // 514 at the first build
  const lamps = result.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>;
  result.setNight(1);
  expect(lamps.material.emissiveIntensity).toBeCloseTo(0.6);
});
