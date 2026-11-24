import { describe, expect, it } from 'vitest';
import { buildLod, footprintBox, type LodGroundManifest } from './lod-build';

const manifest: LodGroundManifest = {
  rows: 21, cols: 41, stepM: 5, bounds: { minX: 0, maxX: 200, minZ: 0, maxZ: 100 },
  scaleM: 0.1, offsetM: 0, noData: -32768, vertical: { sceneZeroNavd88M: 300 },
};
const ground = new ArrayBuffer(2 * 21 * 41);
new Int16Array(ground).fill(3100); // 310 m NAVD88 = 10 m scene

describe('stream LOD', () => {
  it('boxes a footprint with its minimum-area rectangle', () => {
    const box = footprintBox([[0, 0], [10, 10], [5, 15], [-5, 5]])!;
    const side = (i: number) => Math.hypot(box[(i + 1) % 4][0] - box[i][0], box[(i + 1) % 4][1] - box[i][1]);
    expect(side(0) * side(1)).toBeCloseTo(Math.hypot(10, 10) * Math.hypot(5, 5), 3);
  });
  it('builds ground, blocks and forest from shipped area data', () => {
    const r = buildLod({
      buildings: [
        { h: 30, rings: [[[20, 20], [40, 20], [40, 40], [20, 40]]] },
        { floors: 2, rings: [[[60, 20], [62, 20], [62, 22]]] }, // under 25 m²: skipped
      ],
      roads: [{ cls: 'primary', pts: [[0, 50], [200, 50]] }],
      ground: [],
      trees: [[100, 80, 12, 4], [104, 82, 14, 5], [180, 10, 9, 3]],
    }, manifest, ground, { groundStepM: 20, forestCellM: 40, bottomY: -20 });
    expect(r.stats.buildings).toBe(1);
    expect(r.stats.clumps).toBe(2);
    expect(r.hCols).toBe(11);
    expect(r.hRows).toBe(6);
    expect(r.heights[0]).toBeCloseTo(10);
    // One building: four walls and a roof, two triangles each.
    expect(r.blocks.position.length / 9).toBe(10);
    const ys = r.blocks.position.filter((_, i) => i % 3 === 1);
    expect(Math.max(...ys)).toBeCloseTo(40);
    // Ground: 10 x 5 cells, two triangles each, plus the skirt on four sides.
    expect(r.ground.position.length / 9).toBe(10 * 5 * 2 + 2 * (2 * 10 + 2 * 5));
    expect(Math.min(...r.ground.position.filter((_, i) => i % 3 === 1))).toBe(-20);
    expect(r.forest.normal.every(Number.isFinite)).toBe(true);
  });
});
