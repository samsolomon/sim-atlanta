import { expect, test } from 'vitest';
import { runSync } from '../core/slice';
import { farBoxMeshSteps, type FarBox } from './far-board';

test('joins batches across the 16-bit limit, keeping all night windows after the day faces', () => {
  const tower: FarBox = { cx: 13, cz: 37, ux: 1, uz: 0, hx: 24, hz: 20, y0: 5, y1: 88, r: 0.4, g: 0.5, b: 0.6, lit: 1 };
  const one = runSync(farBoxMeshSteps([tower]));
  const vertices = one.day.geometry.getAttribute('position').count;
  const count = Math.ceil(65536 / vertices) + 1;
  const { day, night } = runSync(farBoxMeshSteps(Array.from({ length: count }, () => tower)));
  const faces = one.day.geometry.index!.array;
  const windows = one.night.geometry.index!.array.slice(faces.length);
  expect(windows.length).toBeGreaterThan(0);
  expect(day.geometry.index!.array).toBeInstanceOf(Uint32Array);
  expect(night.geometry.index!.count).toBe(count * (faces.length + windows.length));
  // Check both sides of a packing boundary and the final tower beyond 65535.
  for (const i of [0, 7, 8, count - 1]) {
    const offset = i * vertices;
    const expectedFaces = Array.from(faces, index => index + offset);
    const start = i * faces.length;
    expect(Array.from(day.geometry.index!.array.slice(start, start + faces.length))).toEqual(expectedFaces);
    expect(Array.from(night.geometry.index!.array.slice(start, start + faces.length))).toEqual(expectedFaces);
    const windowStart = count * faces.length + i * windows.length;
    expect(Array.from(night.geometry.index!.array.slice(windowStart, windowStart + windows.length)))
      .toEqual(Array.from(windows, index => index + offset));
  }
  expect(day.geometry.boundingSphere).toEqual(one.day.geometry.boundingSphere);
});
