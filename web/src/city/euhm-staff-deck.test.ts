import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createEuhmStaffDeck, euhmDeckId } from './euhm-staff-deck';

// The two row fragments of the mapped outline, as staged.
const southRing: [number, number][] = [
  [263.16, -1676.34], [263.12, -1667.09], [263.07, -1657.96], [263.83, -1657.96], [335.23, -1657.61],
  [335.32, -1675.99], [352.76, -1675.9], [366.44, -1675.83], [366.49, -1685.13], [366.56, -1700], [263.28, -1700],
];
const northRing: [number, number][] = [
  [263.28, -1700], [366.56, -1700], [366.73, -1733.64], [361.61, -1733.68], [361.62, -1735.93], [364.88, -1735.92],
  [364.93, -1746.65], [359.69, -1746.67], [354.43, -1746.71], [354.37, -1735.9], [357.62, -1735.88], [357.61, -1734],
  [263.45, -1734.47],
];
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 0, maxX: 600, minZ: -2000, maxZ: -1400 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3000).buffer,
);
const top = (group: import('three').Group, x: number, z: number) => {
  group.updateMatrixWorld(true);
  return new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(group)[0].point.y + 323.8;
};

it('builds each row fragment as its own part at shared NAVD88 heights', () => {
  const south: VBuilding = { id: euhmDeckId, h: null, floors: 15, rings: [southRing] };
  const north: VBuilding = { id: euhmDeckId, h: null, floors: 15, rings: [northRing] };
  const other: VBuilding = { id: 'osm:way:1', h: 10, floors: 3, rings: [[[0, -1500], [10, -1500], [10, -1490], [0, -1490]]] };
  const a = createEuhmStaffDeck([south, other], south, grid)!;
  const b = createEuhmStaffDeck([north, other], north, grid)!;
  // Both rows claim only their fragment, so neither draws the generic box.
  expect(a.buildings).toEqual([other]);
  expect(b.buildings).toEqual([other]);
  // Parapet rim at the seam from both sides: a level ray from Spring Street hits
  // the deck just under 348.8 m NAVD88 and clears it just above.
  const hits = (g: import('three').Group, z: number, y: number) => {
    g.updateMatrixWorld(true);
    return new Raycaster(new Vector3(240, y - 323.8, z), new Vector3(1, 0, 0)).intersectObject(g).length > 0;
  };
  for (const [g, z] of [[a.group, -1699], [b.group, -1701]] as const) {
    expect(hits(g, z, 348.6)).toBe(true);
    expect(hits(g, z, 349)).toBe(false);
  }
  // The deck parapet meets at the seam from both sides; the wing and stair differ.
  expect(top(a.group, 300, -1702 + 4)).toBeCloseTo(347, 1);
  expect(top(b.group, 300, -1702)).toBeCloseTo(347, 1);
  expect(top(a.group, 300, -1665)).toBeCloseTo(316, 1);
  expect(top(b.group, 359.5, -1742)).toBeCloseTo(352.2, 1);
  expect(createEuhmStaffDeck([], { ...north, id: 'osm:way:1' }, grid)).toBeNull();
  // An uncut ring builds both halves, wing and stair together.
  const whole: VBuilding = { ...north, rings: [[...northRing.slice(1), ...southRing.slice(0, -1)]] };
  const c = createEuhmStaffDeck([whole], whole, grid)!;
  expect(top(c.group, 300, -1665)).toBeCloseTo(316, 1);
  expect(top(c.group, 359.5, -1742)).toBeCloseTo(352.2, 1);
});
