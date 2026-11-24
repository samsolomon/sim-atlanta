import { expect, it } from 'vitest';
import { type Mesh, Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/carnegie-garage.json';
import { createCarnegieGarage, carnegieGarageId } from './carnegie-garage';
import { detachedParts, footprintReport } from './skin-kit';

// Flat street grade at the lidar ring ground (NAVD88 319.7).
const grid = new GroundGrid(
  {
    version: 1,
    rows: 2,
    cols: 2,
    stepM: 200,
    bounds: { minX: 150, maxX: 350, minZ: -580, maxZ: -380 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1,
    offsetM: 0,
    noData: -32768,
    sha256: '',
  },
  new Int16Array(4).fill(3197).buffer,
);
const site = fixture as unknown as VBuilding;

it('replaces only the garage and preserves the lidar roof split and lift core', () => {
  expect(site.id).toBe(carnegieGarageId);
  const other: VBuilding = {
    id: 'x',
    h: 10,
    floors: 3,
    rings: [
      [
        [700, -500],
        [710, -500],
        [710, -490],
        [700, -490],
      ],
    ],
  };
  const model = createCarnegieGarage([site, other], grid)!;
  expect(model.buildings).toEqual([other]);
  model.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y +
    323.8;
  const localTop = (u: number, v: number) => top(244 + 0.652 * u - 0.758 * v, -482 + 0.758 * u + 0.652 * v);
  expect(localTop(16, 0)).toBeCloseTo(342.8, 0);
  expect(localTop(16, 23)).toBeCloseTo(345.8, 0);
  expect(localTop(-18, -27)).toBeCloseTo(352.4, 1);
  expect(createCarnegieGarage([other], grid)).toBeNull();
});

it('stays inside the routine triangle budget and its own outline, with nothing loose', () => {
  const model = createCarnegieGarage([site], grid)!;
  let tris = 0;
  model.group.traverse((o) => {
    const g = (o as Mesh).geometry;
    if (g) tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  });
  expect(tris).toBeLessThanOrEqual(600);
  const rings = site.rings.slice(0, 1);
  const r = footprintReport(model.group, rings, { bottom: 319.7 - 323.8 - 8 });
  expect(r.worst).toBeLessThanOrEqual(0.3);
  expect(r.vertical).toBe(0);
  expect(detachedParts(model.group, rings)).toEqual([]);
});
