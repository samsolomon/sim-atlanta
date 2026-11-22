import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { createFlatiron } from './flatiron';
import type { VBuilding } from '../vignette/world';

const lot: VBuilding = {
  id: '200f8a75-44d8-4a11-8ff8-6af148cc6b17',
  floors: 11,
  h: 44,
  rings: [
    [
      [265.2, -237.55],
      [261.77, -240.26],
      [230.8, -215.56],
      [242.55, -201.89],
      [243.29, -201.5],
      [244.1, -201.29],
      [244.92, -201.21],
      [245.75, -201.31],
      [246.53, -201.6],
      [247.24, -202.03],
      [247.86, -202.59],
      [248.34, -203.25],
    ],
  ],
};

it('keeps the acute end and projects the central Peachtree bays ahead of the flat end bays', () => {
  const neighbor = { ...lot, id: 'other' };
  const result = createFlatiron([lot, neighbor], () => 0)!;
  expect(result.buildings).toEqual([neighbor]);
  const ring = lot.rings[0];
  const [x, z] = ring[11],
    [ex, ez] = ring[0],
    length = Math.hypot(ex - x, ez - z);
  const along = new Vector3((ex - x) / length, 0, (ez - z) / length);
  const normal = new Vector3(-along.z, 0, along.x);
  const depth = (fraction: number, height: number) => {
    const eye = new Vector3(x, height, z).addScaledVector(along, length * fraction).addScaledVector(normal, 3);
    return new Raycaster(eye, normal.clone().negate()).intersectObjects(result.group.children)[0]?.distance;
  };
  expect(depth(4.5 / 9, 17.4)).toBeLessThan(2.32);
  expect(depth(0.5 / 9, 17.4)).toBeGreaterThan(2.86);
  expect(depth(4.5 / 9, 35.9)).toBeCloseTo(2.01, 2);
  const material = (result.group.children[1] as Mesh).material;
  result.setNight(1);
  expect(material).toMatchObject({ emissiveIntensity: 0.31 });
  result.setNight(0);
  expect(material).toMatchObject({ emissiveIntensity: 0 });
  expect(createFlatiron([neighbor], () => 0)).toBeNull();
  expect(createFlatiron([lot], () => null)).toBeNull();
});
