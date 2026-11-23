import { expect, it } from 'vitest';
import { orbitNear } from './depth-range';

it('keeps the close-in near plane and tightens the depth range far out', () => {
  // Sam's High Museum view: 150 m orbit, about 100 m up. Unchanged from the fixed 20 m.
  expect(orbitNear(150, 96)).toBe(20);
  // Full-board framing, about 12 km out and 9.8 km up: depth steps fall from ~0.4 m to ~3 mm.
  const near = orbitNear(12000, 9800);
  expect(near).toBe(2400);
  expect(12000 ** 2 / (near * 2 ** 24)).toBeLessThan(0.005);
  // Never past half the clearance over the skyline, so no tower can be clipped.
  expect(orbitNear(3000, 600)).toBe(125);
  expect(orbitNear(NaN, 100)).toBe(20);
});
