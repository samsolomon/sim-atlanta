import { describe, expect, it } from 'vitest';
import { railBedY, railSpanAt, type RailData, type RailSpan } from './scene-data';

const span = (s0: number, s1: number, extra: Partial<RailSpan> = {}): RailSpan => ({ s0, s1, cover: 'open', form: 'cut', base: 'ground', rel: 0, height: 'schematic', ev: 'e', ...extra });
const rail: RailData = { version: 1, datum: 'track-bed', evidence: {}, paths: { p: [span(0, 10), span(10, 20, { cover: 'covered' }), span(30, 40)] } };

describe('railSpanAt', () => {
  it('finds half-open spans and returns null in gaps, off the ends, and for older bakes', () => {
    expect(railSpanAt(rail, 'p', 0)?.s0).toBe(0);
    expect(railSpanAt(rail, 'p', 10)?.cover).toBe('covered'); // [s0, s1)
    expect(railSpanAt(rail, 'p', 25)).toBeNull();
    expect(railSpanAt(rail, 'p', 40)).toBeNull();
    expect(railSpanAt(rail, 'p', -1)).toBeNull();
    expect(railSpanAt(rail, 'other', 5)).toBeNull();
    expect(railSpanAt(undefined, 'p', 5)).toBeNull(); // scene.json without `rail`
  });
});

describe('railBedY', () => {
  const ground = (x: number) => -x / 10; // falls 1 m per 10 m east
  it('beds ground spans on the local ground', () => {
    expect(railBedY(span(0, 10, { rel: 0 }), 5, -3, ground)).toBe(-3);
  });
  it('hangs anchored spans from anchor ground, not the ground under the track', () => {
    const v = span(0, 100, { base: 'anchors', rel: 7, form: 'viaduct', anchors: [{ s: 0, x: 0, z: 0, at: 'a', rel: 0 }, { s: 100, x: 100, z: 0, at: 'b' }] });
    expect(railBedY(v, 0, -50, ground)).toBe(0); // anchor rel 0 overrides span rel
    expect(railBedY(v, 100, -50, ground)).toBe(-10 + 7);
    expect(railBedY(v, 50, -50, ground)).toBeCloseTo((0 + -3) / 2); // a road dip under it doesn't matter
    expect(railBedY(v, 150, -50, ground)).toBe(-3); // flat beyond the last anchor
    expect(railBedY(v, -20, -50, ground)).toBe(0); // and before the first
  });
  it('extends a single anchor by its grade', () => {
    const v = span(0, 100, { base: 'anchors', rel: 2, grade: 0.01, anchors: [{ s: 10, x: 0, z: 0, at: 'a' }] });
    expect(railBedY(v, 60, 0, ground)).toBeCloseTo(2.5);
  });
});
