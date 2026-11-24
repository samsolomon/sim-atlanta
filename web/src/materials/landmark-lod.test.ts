import { describe, expect, it } from 'vitest';
import { farTriangles } from './landmark-lod';

/** Non-indexed quads (two triangles each) with one colour per quad. */
function quads(list: { corners: number[][]; color: number[]; flip?: boolean }[]) {
  const P: number[] = [], C: number[] = [];
  for (const { corners: [a, b, c, d], color, flip } of list) {
    const tris = flip ? [[a, c, b], [a, d, c]] : [[a, b, c], [a, c, d]];
    for (const t of tris) for (const v of t) { P.push(...v); C.push(...color); }
  }
  return { P: new Float32Array(P), C: new Float32Array(C) };
}
const wall = { corners: [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]], color: [1, 1, 1] };
/** A 1 x 2 m pane at (x, y), `z` off the wall. */
const pane = (x: number, y: number, z = 0.07, flip = false) =>
  ({ corners: [[x, y, z], [x + 1, y, z], [x + 1, y + 2, z], [x, y + 2, z]], color: [0, 0, 0], flip });

describe('farTriangles', () => {
  it('drops panes on a wall and darkens the wall by the area they covered', () => {
    // Ten panes, 20 m² of a 100 m² wall, one wound the other way round.
    const { P, C } = quads([wall, ...Array.from({ length: 10 }, (_, i) => pane(i % 5 * 2, Math.floor(i / 5) * 4 + 1, 0.07, i === 3))]);
    const far = farTriangles(P, C, 3, 0, P.length / 9, 4)!;
    expect(far.dropped).toBe(20);
    expect(far.kept).toEqual([]);
    expect(far.walls.map(w => w.t)).toEqual([0, 1]);
    // White wall, black panes covering a fifth: 0.8 grey.
    for (const w of far.walls) for (const v of w.color) expect(v).toBeCloseTo(0.8, 5);
  });

  it('keeps detail that sits on no wall, so nothing opens a hole', () => {
    const railing = { corners: [[20, 0, 0], [21, 0, 0], [21, 1, 0], [20, 1, 0]], color: [0.5, 0.5, 0.5] };
    const offWall = pane(2, 2, 1.5);
    const { P, C } = quads([wall, pane(1, 1), railing, offWall]);
    const far = farTriangles(P, C, 3, 0, P.length / 9, 4)!;
    expect(far.dropped).toBe(2);
    expect(far.kept).toEqual([4, 5, 6, 7]);
  });

  it('keeps detail that overhangs the edge of its wall', () => {
    // Centroid over the wall (x < 10), one corner beyond it: no wall behind that part.
    const overhang = { corners: [[9, 1, 0.07], [11, 1, 0.07], [11, 3, 0.07], [9, 3, 0.07]], color: [0, 0, 0] };
    const { P, C } = quads([wall, pane(1, 1), overhang]);
    const far = farTriangles(P, C, 3, 0, P.length / 9, 4)!;
    expect(far.dropped).toBe(2);
    expect(far.kept).toEqual([4, 5]);
  });

  it('returns null when nothing would drop', () => {
    const { P, C } = quads([wall]);
    expect(farTriangles(P, C, 3, 0, 2, 4)).toBeNull();
  });
});
