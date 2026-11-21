/** The flat board's open-cut slot (City): synthetic data, no baked files needed. */
import { describe, expect, it } from 'vitest';
import type * as THREE from 'three';
import { Line } from './geom';
import { World, type Alignment, type VData } from './world';

const data = { name: 'test', bounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 }, buildings: [], roads: [], rail: [], ground: [], points: [], lines: [] } as unknown as VData;
// A line along x: tunnel (-10 m) beyond |x| = 40, an open cut (-4 m) within |x| = 30.
const line = new Line([[-150, 0], [150, 0]]);
const cut: Alignment = {
  line,
  elev: (s) => {
    const d = Math.abs(s - 150);
    return d <= 30 ? -4 : d >= 40 ? -10 : -4 - ((d - 30) / 10) * 6;
  },
};

/** Does the board's ground mesh have a triangle over (x, z)? */
function covered(w: World, x: number, z: number) {
  const pos = ((w.group.children[0] as THREE.Mesh).geometry.attributes.position.array) as Float32Array;
  for (let i = 0; i < pos.length; i += 9) {
    const [ax, az, bx, bz, cx, cz] = [pos[i], pos[i + 2], pos[i + 3], pos[i + 5], pos[i + 6], pos[i + 8]];
    const d1 = (x - bx) * (az - bz) - (ax - bx) * (z - bz);
    const d2 = (x - cx) * (bz - cz) - (bx - cx) * (z - cz);
    const d3 = (x - ax) * (cz - az) - (cx - ax) * (z - az);
    if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) return true;
  }
  return false;
}

describe('flat board open cuts', () => {
  it('leaves a slot over a below-grade open run, and only there', () => {
    const w = new World(data, null, { terrain: 'flat', clumps: 1, lightMapMax: 256 });
    w.setOpenCuts([cut]);
    w.buildBoard();
    expect(covered(w, 0, 0)).toBe(false); // the cut
    expect(covered(w, 25, 2)).toBe(false);
    expect(covered(w, 0, 9)).toBe(true); // beside it
    expect(covered(w, 60, 0)).toBe(true); // past either portal: tunnel under ground
    expect(covered(w, -60, 0)).toBe(true);
  });

  it('is a no-op without cuts and on the sculpted East Portal board', () => {
    const flat = new World(data, null, { terrain: 'flat', clumps: 1, lightMapMax: 256 });
    flat.buildBoard();
    expect(covered(flat, 0, 0)).toBe(true);
    const trench = new World(data, cut, { terrain: 'trench', clumps: 1, lightMapMax: 256 });
    trench.setOpenCuts([cut]);
    trench.buildBoard();
    expect(covered(trench, 0, 0)).toBe(true); // East Portal sculpts its cut into the heightfield instead
  });
});

it('keeps a viaduct pier off the lower freight track and places its column beside it', () => {
  const w = new World(data, null, { terrain: 'flat', clumps: 1, lightMapMax: 256 });
  w.buildMarta({ line: new Line([[0, 0], [0, 80]]), elev: () => 8 }, x => x < -2);
  const pos = (w.group.children[0] as THREE.Mesh).geometry.attributes.position;
  const columnBaseX: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(pos.getY(i)) < .001) columnBaseX.push(pos.getX(i));
  }
  expect(columnBaseX.length).toBeGreaterThan(0);
  expect(Math.max(...columnBaseX)).toBeLessThan(-2);
});
