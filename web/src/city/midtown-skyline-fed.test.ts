import { Group } from 'three';
import { expect, it } from 'vitest';
import { Builder, segDist, type P2 } from '../vignette/geom';
import { federalReserve } from './midtown-skyline-fed';

it('keeps every window frame on its own wall, including the short segments of the low wing', () => {
  const rings: P2[][] = [], frames: number[][][] = [];
  const body = new Builder(), draw = body.quad.bind(body);
  body.quad = (a, b, c, d, color) => { if (color === '#2c3238') frames.push([a, b, c, d]); draw(a, b, c, d, color); };
  const shell = { base: 0, body, lights: new Builder(), prism: (ring: P2[]) => rings.push(ring), finish: () => ({ group: new Group() }) };
  const build = federalReserve(shell as unknown as Parameters<typeof federalReserve>[0], () => 0);
  while (!build.next().done) { /* run every step */ }
  expect(frames.length).toBeGreaterThan(50);
  const walls = rings.flatMap(r => r.map((a, i) => [a, r[(i + 1) % r.length]] as const));
  const off = Math.max(...frames.flat().map(([x, , z]) => Math.min(...walls.map(([a, b]) => segDist(x, z, a, b)))));
  expect(off).toBeLessThan(.5); // frames sit a few centimetres proud; they never run past a corner into the air
});
