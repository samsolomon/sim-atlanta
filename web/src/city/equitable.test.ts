import { Mesh, PlaneGeometry, Raycaster, Vector3 } from 'three';
import { expect, it, vi, afterEach } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createEquitable } from './equitable';
afterEach(() => vi.unstubAllGlobals());

it('puts the display pair on opposite broad faces with the measured dimensions and roof datum', () => {
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) });
  const site: VBuilding = {
    id: 'e14e24d5-1e78-423b-baec-0529477c10a2',
    h: 138,
    floors: 35,
    rings: [
      [
        [307.56, -332.93],
        [284.76, -359.39],
        [245.98, -326],
        [268.78, -299.53],
      ],
    ],
  };
  const next = { ...site, id: 'neighbor' };
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 100,
      bounds: { minX: 230, maxX: 330, minZ: -380, maxZ: -280 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3230).buffer
  );
  const { group, buildings } = createEquitable([next, { ...site, rings: [[...site.rings[0]].reverse()] }], grid)!;
  expect(buildings).toEqual([next]);
  group.updateMatrixWorld(true);
  const boards = group.children.filter(
    (obj) => obj instanceof Mesh && obj.geometry instanceof PlaneGeometry
  ) as Mesh<PlaneGeometry>[];
  expect(boards).toHaveLength(2);
  const center = new Vector3(276.77, 0, -329.46);
  for (const board of boards) {
    expect(board.geometry.parameters.width).toBeCloseTo(53.0352);
    expect(board.geometry.parameters.height).toBeCloseTo(6.096);
    const normal = new Vector3(0, 0, 1).applyQuaternion(board.quaternion);
    const offset = board.position.clone().sub(center);
    offset.y = 0;
    expect(normal.dot(offset)).toBeCloseTo(17.92, 1);
    expect(Math.abs(normal.x)).toBeCloseTo(0.652, 2);
  }
  const top =
    new Raycaster(new Vector3(282, 200, -330), new Vector3(0, -1, 0)).intersectObject(group)[0].point.y + 323.8;
  expect(top).toBeCloseTo(459.9);
  expect(createEquitable([next], grid)).toBeNull();
});
