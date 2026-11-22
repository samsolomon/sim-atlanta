import { expect, it } from 'vitest';
import { Box3, Mesh } from 'three';
import type { VBuilding } from '../vignette/world';
import { createTruistPlaza } from './truist-plaza';

it('separates the architectural cap from the tip and keeps the roof neighbors', () => {
  const source: VBuilding = {id:'d589ba16-ac92-4a00-8386-1d8098172a80',h:265,floors:46,
    rings:[[[425,-1021],[510,-1021],[510,-936],[425,-936]]]};
  const roof = {...source,id:'arcade'};
  const result = createTruistPlaza([roof,source],()=>3)!;
  expect(result.buildings).toEqual([roof]);
  const p=(result.group.children[0] as Mesh).geometry.attributes.position;
  expect(Array.from({length:p.count},(_,i)=>p.getY(i)).some(y=>Math.abs(y-264.3)<.001)).toBe(true);
  expect(new Box3().setFromObject(result.group).max.y).toBeCloseTo(278);
  expect(createTruistPlaza([source],()=>null)).toBeNull();
});
