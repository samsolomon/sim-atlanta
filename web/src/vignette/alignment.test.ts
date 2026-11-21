import { expect, it } from 'vitest';
import { alignment } from './alignment';

it('keeps full-path metres at a smoothed curve after clipping the approach to the board', () => {
  const degree = 180 / (Math.PI * 6_371_008.8);
  const coords = [-600, 0, 0, 0, 60, 0, 60, 121].map(v => v * degree);
  const path = { id: 'curve', routeId: 'blue', coords, cum: [0, 600, 660, 781] };
  const bounds = { minX: -5, maxX: 150, minZ: -150, maxZ: 5 };
  const manifest = { name: 'test', origin: { lon: 0, lat: 0 }, bounds, profiles: {}, notes: '', sources: [] };
  const track = alignment({ routes: [], stops: [], paths: [path] }, manifest, bounds, path.id);
  expect(track.pathMetresAt(0)).toBeCloseTo(600);
  // The corner was 60 m along the cropped path, but smoothing cut the corner.
  const corner = track.line.cum[30];
  expect(corner).toBeLessThan(59);
  expect(track.pathMetresAt(corner)).toBeCloseTo(660);
  expect(track.pathMetresAt((corner + track.line.cum[31]) / 2)).toBeCloseTo(661);
  expect(track.pathMetresAt(track.line.length)).toBeCloseTo(781);
});
