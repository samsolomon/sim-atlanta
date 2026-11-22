import { expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3 } from 'three';
import type { VBuilding } from '../vignette/world';
import { createCentralLibrary } from './central-library';

it('leaves the high Forsyth opening clear into the terrace and keeps the Carnegie neighbor', () => {
  const source: VBuilding = {id:'9578af9e-4715-40b8-822a-047b4cf16d9a',h:21.45,floors:6,
    rings:[[[259.94,-424.61],[255.95,-421.33],[281.06,-391.71],[327.12,-430.88],[301.91,-460.44],
      [297.97,-457.07],[293.09,-462.86],[291.3,-461.15],[289.24,-463.57],[254.77,-434.37],
      [256.93,-432.03],[255.04,-430.37]]]};
  const neighbor = {...source, id:'hotel'};
  const result = createCentralLibrary([source,neighbor], () => 4)!;
  expect(result.buildings).toEqual([neighbor]);
  expect(result.group.position.y).toBe(4);
  // Intersect the untransformed mesh in architectural coordinates, looking into the facade.
  const shell = result.group.children[0] as Mesh;
  const depth = (u: number, y: number) => new Raycaster(new Vector3(u,y,2), new Vector3(0,0,-1))
    .intersectObject(shell, false)[0]?.distance;
  expect(depth(32.4,22)).toBeGreaterThan(16);
  expect(depth(28.1,22)).toBeCloseTo(2);
  expect(depth(32.4,26.5)).toBeCloseTo(2);
  expect(createCentralLibrary([neighbor], () => 4)).toBeNull();
  expect(createCentralLibrary([source], () => null)).toBeNull();
});
