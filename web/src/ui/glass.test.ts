import { describe, expect, it } from 'vitest';
import { cornerShape, resolveGlassMode } from './glass';

describe('glass mode', () => {
  it('lets flat (Low) win, and uses canvas only while the renderer draws backings', () => {
    expect(resolveGlassMode('flat', true)).toBe('flat');
    expect(resolveGlassMode('flat', false)).toBe('flat');
    expect(resolveGlassMode('css', true)).toBe('canvas');
    expect(resolveGlassMode('css', false)).toBe('css');
  });
});

describe('glass corner shape', () => {
  it('rounds all four corners of a 16 px panel', () => {
    expect(cornerShape(['16px', '16px', '16px', '16px'], 360, 578)).toEqual({ radius: 16, mask: 15 });
  });
  it('rounds only the top of a phone sheet', () => {
    expect(cornerShape(['24px', '24px', '0px', '0px'], 390, 532)).toEqual({ radius: 24, mask: 3 });
  });
  it('turns 50% into a circle for the compass', () => {
    expect(cornerShape(['50%', '50%', '50%', '50%'], 44, 44)).toEqual({ radius: 22, mask: 15 });
  });
  it('clamps a 999px pill to half its height', () => {
    expect(cornerShape(['999px', '999px', '999px', '999px'], 469, 44)).toEqual({ radius: 22, mask: 15 });
  });
  it('reports square corners as mask 0', () => {
    expect(cornerShape(['0px', '0px', '0px', '0px'], 100, 40)).toEqual({ radius: 0, mask: 0 });
  });
});
