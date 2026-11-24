import { ShaderLib } from 'three';
import { expect, it } from 'vitest';
import { GLASS_FLOOR, glassFloorChunk, glassFloorStrength, installGlassFloor, isGlassColour } from './glass-floor';

const lin = (hex: string) => [1, 3, 5].map(i => {
  const c = parseInt(hex.slice(i, i + 2), 16) / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}) as [number, number, number];

it('reads skin glass as glass and every other facade material as not', () => {
  for (const glass of ['#8a9499', '#5d7f98', '#6b8aa3', '#9fb4c4', '#4f6b82', '#7f97a8', '#3f4448']) expect(isGlassColour(lin(glass)), glass).toBe(true);
  for (const other of ['#a38672', '#d9d4c8', '#a7a39a', '#ece8de', '#b9b3a7', '#a9a59d', '#76736d', '#e9e8e3', '#2b2d2f'])
    expect(isGlassColour(lin(other)), other).toBe(false);
});

it('patches the Lambert source once, before opaque_fragment, keyed to nothing new', () => {
  const before = ShaderLib.lambert.fragmentShader;
  installGlassFloor(0.45);
  installGlassFloor(0.6); // ignored
  const after = ShaderLib.lambert.fragmentShader;
  expect(after).not.toBe(before);
  expect(after.split('glassDay').length - 1).toBe(2);
  expect(after).toContain('0.450 * glassDay');
  expect(after.indexOf('outgoingLight = max(')).toBeLessThan(after.indexOf('#include <opaque_fragment>'));
  expect(glassFloorChunk(0.35)).toContain('abs(glassUp.y) < 0.35');
});

it('takes a strip strength from the URL in dev builds only', () => {
  expect(glassFloorStrength('?glassfloor=0.35', true)).toBe(0.35);
  expect(glassFloorStrength('?glassfloor=0', true)).toBe(0);
  expect(glassFloorStrength('?glassfloor=0.35', false)).toBe(GLASS_FLOOR);
  expect(glassFloorStrength('?glassfloor=9', true)).toBe(GLASS_FLOOR);
});
