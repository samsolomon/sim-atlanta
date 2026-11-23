import { expect, test } from 'vitest';
import { minOrbitDistance } from './dev-camera';

const q = (s: string) => new URLSearchParams(s);

test('lowers the orbit limit only in a dev build with ?dev and mindist', () => {
  expect(minOrbitDistance(q('?dev&mindist=20'), true)).toBe(20);
  expect(minOrbitDistance(q('?dev&mindist=20'), false)).toBe(150);
  expect(minOrbitDistance(q('?mindist=20'), true)).toBe(150);
  expect(minOrbitDistance(q('?dev'), true)).toBe(150);
});

test('clamps the requested limit to 5–150 m and ignores junk', () => {
  expect(minOrbitDistance(q('?dev&mindist=1'), true)).toBe(5);
  expect(minOrbitDistance(q('?dev&mindist=900'), true)).toBe(150);
  expect(minOrbitDistance(q('?dev&mindist=abc'), true)).toBe(150);
});
