import { expect, it } from 'vitest';
import { formatCityCamera, parseCityCamera } from '../core/camera';
import { maxStreetTilt, minStreetDistance, streetBlend, streetFov } from './street-eye';

it.each([
  { x: 6, z: -546, bearing: 129.66784, tilt: 101.95728, distanceM: 272.2241, lens: 47 },
  { x: -380, z: -4752, bearing: 125.53768, tilt: 91.47978, distanceM: 77.44676, lens: 34 },
])('retains the upward sightline and vertical lens after sharing at $x,$z', pose => {
  const shared = parseCityCamera(formatCityCamera(pose))!;
  expect(shared.tilt).toBeCloseTo(pose.tilt, 3);
  expect(shared.bearing).toBeCloseTo(pose.bearing, 3);
  expect(shared.distanceM).toBeCloseTo(pose.distanceM, 3);
  expect(maxStreetTilt(shared.distanceM)).toBeGreaterThan(shared.tilt);
  expect(minStreetDistance(shared.tilt, 150)).toBeLessThan(shared.distanceM);
  expect(streetFov(streetBlend(shared.tilt), shared.distanceM)).toBe(pose.lens);
});

it('preserves the overview and the old close orbit at its published tilt', () => {
  expect(maxStreetTilt(600)).toBe(70);
  expect(minStreetDistance(70, 150)).toBe(150);
  expect(streetFov(streetBlend(70), 150)).toBe(22);
});
