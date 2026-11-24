import { Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { expect, it } from 'vitest';
import { genericV2, setGenericV2 } from './generic-v2';
import { World, type VBuilding } from './world';

// A 40 x 40 m parent reported at 200 m whose mapped parts are a 150 m tower,
// a 12 m podium and a canopy bridging 4-5 m between them.
const parent: VBuilding = {
  id: 'osm:way:1', cls: 'apartments', floors: 50, h: 200,
  rings: [[[0, 0], [40, 0], [40, 40], [0, 40]]],
  parts: [
    { id: 'osm:way:2', rings: [[[0, 0], [20, 0], [20, 40], [0, 40]]], h: 150, tier: 'inferred' },
    { id: 'podium', rings: [[[20, 0], [40, 0], [40, 30], [20, 30]]], h: 12, tier: 'reported' },
    { id: 'osm:way:3', rings: [[[20, 30], [40, 30], [40, 40], [20, 40]]], h: 5, minH: 4, tier: 'inferred' },
  ],
};

function shell(buildings: VBuilding[], quality: 'low' | 'high' = 'high') {
  const bounds = { minX: -20, maxX: 60, minZ: -20, maxZ: 60 };
  const w = new World({ bounds, buildings, roads: [], rail: [] }, null, { terrain: 'flat', clumps: 1, lightMapMax: 256 });
  w.buildBuildings(() => 0, 8, undefined, quality);
  return w.group.children[0] as Mesh<BufferGeometry>;
}
const hit = (mesh: Mesh, x: number, z: number, from = 500, dir = -1) =>
  new Raycaster(new Vector3(x, from, z), new Vector3(0, dir, 0)).intersectObject(mesh)[0]?.point.y;

it('draws mapped building parts in place of the parent box', () => {
  const mesh = shell([parent]);
  expect(hit(mesh, 10, 20)).toBeCloseTo(150);
  expect(hit(mesh, 30, 15)).toBeCloseTo(12);
  // No 200 m parent roof anywhere over the plan.
  expect(hit(mesh, 30, 35)).toBeCloseTo(5);
  // The canopy has an underside: from below it starts at 4 m, open beneath.
  expect(hit(mesh, 30, 35, -50, 1)).toBeCloseTo(4);
});

it('keeps a building without parts as one box at its own height', () => {
  const { parts: _, ...plain } = parent;
  expect(hit(shell([plain]), 30, 35)).toBeCloseTo(200);
});

it('simplifies a low-tier v2 tower while preserving its facade style and storey origins', () => {
  const previous = genericV2();
  try {
    setGenericV2(true);
    const high = shell([parent], 'high').geometry;
    const low = shell([parent], 'low').geometry;
    expect(low.attributes.position.count).toBeLessThan(high.attributes.position.count);
    for (const { attributes } of [low, high]) {
      expect(attributes.aBase.count).toBe(attributes.position.count);
      expect(attributes.aStyle.count).toBe(attributes.position.count);
    }
    const shaftStyles = (geometry: BufferGeometry) =>
      new Set(Array.from(geometry.attributes.aStyle.array).filter(style => style >= 20 && style < 52));
    expect(shaftStyles(high).size).toBe(1);
    expect(shaftStyles(low)).toEqual(shaftStyles(high));
  } finally {
    setGenericV2(previous);
  }
});
