import { expect, it } from 'vitest';
import { dominantWallStyle } from './far-board';

/** One wall quad (two triangles) w × h metres at height y0, all in one style. */
function wall(pos: number[], style: number[], st: number, w: number, y0: number, h: number) {
  for (const [a, b, c] of [[[0, y0], [w, y0], [w, y0 + h]], [[0, y0], [w, y0 + h], [0, y0 + h]]]) {
    for (const [x, y] of [a, b, c]) { pos.push(x, y, 0); style.push(st); }
  }
}

it('picks the wall style covering the most area, and never a ground-floor base style over another', () => {
  const pos: number[] = [], style: number[] = [];
  wall(pos, style, 53, 40, 0, 4);   // arcade base: 160 m², the largest by itself
  wall(pos, style, 21, 10, 4, 12);  // office shaft above it: 120 m²
  wall(pos, style, -1, 40, 16, 0.5); // roof edge, no style
  const pick = dominantWallStyle(pos, style, 0, pos.length / 3);
  expect(pick.style).toBe(21);
  expect(pick.first).toBe(6);
  // The base is kept apart as the ground-floor band, up to its top.
  expect(pick.baseStyle).toBe(53);
  expect(pick.baseTop).toBe(4);
  // A building that is only a base keeps it.
  const only = dominantWallStyle(pos, style, 0, 6);
  expect(only.style).toBe(53);
  // Area, not vertex count: a large plain wall beats many small panels.
  const p2: number[] = [], s2: number[] = [];
  for (let i = 0; i < 5; i++) wall(p2, s2, 2, 1, i, 1);
  wall(p2, s2, 0, 30, 0, 10);
  expect(dominantWallStyle(p2, s2, 0, p2.length / 3).style).toBe(0);
});
