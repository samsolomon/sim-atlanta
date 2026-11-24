import { expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { ajcDeckId, ajcPlantId, createAjcPlant } from './ajc-plant';
import { detachedParts, footprintReport } from './skin-kit';

// The two staged Overture outlines (downtown data is not committed, so they are copied here).
const deckRing: [number, number][] = [[-146.33, -282.48], [-129.5, -263.03], [-89.33, -296.65], [-109.3, -321.41], [-147.26, -288.21], [-144.64, -284.27]];
const plantRing: [number, number][] = [[-69.45, -271.86], [-89.33, -296.65], [-129.5, -263.03], [-97.48, -225.73], [-98.47, -224.63],
  [-76.93, -199.68], [-37.55, -234.17], [-58.02, -259.52], [-62.52, -256.24], [-72.68, -269.08]];

it('claims both AJC outlines with one skin at their lidar roofs, inside both footprints with nothing loose', () => {
  const deck: VBuilding = { id: ajcDeckId, h: 41.5, floors: 6, rings: [deckRing] };
  const plant: VBuilding = { id: ajcPlantId, h: null, floors: 6, rings: [plantRing] };
  const other = { ...deck, id: 'unrelated' };
  const grid = new GroundGrid({ version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: -400, maxX: 200, minZ: -600, maxZ: 0 }, encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 }, scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '' },
  new Int16Array(4).fill(3140).buffer);
  const model = createAjcPlant([deck, plant, other], grid)!;
  expect(model.buildings).toEqual([other]);
  model.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 300;
  expect(top(-125, -300)).toBeCloseTo(314 + 36.5, 1); // the deck
  expect(top(-100, -262)).toBeCloseTo(314.5 + 37.2, 1); // the plant roof
  expect(top(-49.5, -229)).toBeCloseTo(314.5 + 45, 1); // its raised north-east block
  const [body] = model.group.children as Mesh[];
  expect(body.geometry.getAttribute('position').count / 3).toBeLessThanOrEqual(2400);
  // The deck's north-west face is a single surface at the old first drain and at the tile base.
  const [start, end] = [deckRing[4], deckRing[3]];
  const normal = new Vector3(end[1] - start[1], 0, start[0] - end[0]).normalize();
  for (const y of [16, 30]) {
    const wall = new Vector3(start[0] + (end[0] - start[0]) / 8, y, start[1] + (end[1] - start[1]) / 8);
    const ray = new Raycaster(wall.addScaledVector(normal, 2), normal.clone().negate(), 0, 2.1);
    const hits = ray.intersectObject(body);
    expect(hits).toHaveLength(1);
    expect(hits[0].distance).toBeCloseTo(2, 4);
  }
  const rings = [deckRing, plantRing];
  const report = footprintReport(model.group, rings, { bottom: 314 - 300 - 8 });
  expect(report.worst).toBe(0);
  expect(report.vertical).toBe(0);
  expect(detachedParts(model.group, rings)).toEqual([]);
  model.setNight(1);
});
