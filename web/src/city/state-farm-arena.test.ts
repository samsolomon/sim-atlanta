import { expect, it } from 'vitest';
import type { Mesh } from 'three';
import type { VBuilding } from '../vignette/world';
import { createStateFarmArena } from './state-farm-arena';

// Actual downtown outline, including the recessed station-side corners.
const arena: VBuilding = {
  id: '274e7277-5fe9-4a57-9e5c-01a6e6458c8a', h: 47.6, floors: null,
  rings: [[[-442.27,-439.69],[-514.33,-441.11],[-517.45,-323.24],[-484.6,-322.12],
    [-464.98,-292.63],[-457.51,-299.23],[-457.62,-284.5],[-447.69,-289.49],[-447.32,-280.66],
    [-440.64,-283.29],[-433.97,-286.05],[-408.34,-296.69],[-361.37,-316.21],[-370.09,-327.38],
    [-369.96,-338.56],[-367.84,-436.17],[-367.59,-446.82],[-399.09,-433.09],[-398.64,-438.83],
    [-430.53,-439.47],[-435.98,-444.51]]],
};

it('retains the adjoining buildings and raises the diagonal roof above the corner roofs', () => {
  const neighbor = {...arena, id: 'The CTR'};
  const result = createStateFarmArena([neighbor, arena], () => -12)!;
  expect(result.buildings).toEqual([neighbor]);
  expect(result.group.position.y).toBe(-12);
  const p = (result.group.children[0] as Mesh).geometry.getAttribute('position');
  // The barrel crest lies on a diagonal between the midpoints of its short ends.
  const at = (x: number, z: number) => {
    const elevations: number[] = [];
    for (let i = 0; i < p.count; i++)
      if (Math.hypot(p.getX(i)-x,p.getZ(i)-z)<.1) elevations.push(p.getY(i));
    return Math.max(...elevations);
  };
  expect(at(-489.5,-332.5)).toBeGreaterThan(46);
  expect(at(-405,-410)).toBeGreaterThan(46);
  expect(at(-514.33,-441.11)).toBe(29);
  expect(createStateFarmArena([neighbor], () => 0)).toBeNull();
  expect(createStateFarmArena([arena], () => null)).toBeNull();
  expect(createStateFarmArena([{...arena, rings:[[[-430,-410],[-420,-410],[-420,-400]]]}], () => 0)).toBeNull();
});
