import { expect, it } from 'vitest';
import { Box3, Mesh, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createCoreyTower } from './corey';

it('centres the tapered stack in the mapped base and places the single LED face toward the Grady Curve', () => {
  const grid = new GroundGrid({version: 1, rows: 2, cols: 2, stepM: 50,
    bounds: {minX: 760, maxX: 810, minZ: 600, maxZ: 650}, encoding: 'signed int16 little-endian',
    vertical: {crs: 'EPSG:5703', sceneZeroNavd88M: 323.8}, scaleM: .1, offsetM: 0, noData: -32768, sha256: ''},
  new Int16Array([3134, 3134, 3134, 3134]).buffer);
  const stack: VBuilding = {id: 'fc0ebaec-e791-4f06-8a3d-b560d49032f2', floors: null, h: 91.44,
    rings: [[[786.5,615.46],[794.52,623.46],[786.5,631.47],[778.5,623.46]]]};
  const plant = {...stack, id: 'adjacent-plant'};
  const {group, buildings} = createCoreyTower([stack, plant], grid)!;
  expect(buildings).toEqual([plant]);
  expect(group.position.x).toBeCloseTo(786.51);
  expect(group.position.z).toBeCloseTo(623.465);
  expect(group.children).toHaveLength(2);
  const [shaft, screen] = group.children as Mesh[];
  const pts = shaft.geometry.getAttribute('position');
  const maxRadiusAt = (h: number) => {
    const radii: number[] = [];
    for (let i = 0; i < pts.count; i++)
      if (Math.abs(pts.getY(i) - h) < .01) radii.push(Math.hypot(pts.getX(i), pts.getZ(i)));
    return Math.max(...radii);
  };
  expect(maxRadiusAt(3.65)).toBeCloseTo(5.48);
  expect(maxRadiusAt(91.44)).toBeCloseTo(4.04);
  screen.geometry.computeBoundingBox();
  const box = screen.geometry.boundingBox as Box3;
  const size = box.getSize(new Vector3());
  expect(size.x).toBeCloseTo(7.62);
  expect(size.y).toBeCloseTo(24.384);
  const center = box.getCenter(new Vector3());
  group.updateMatrixWorld(true);
  const direction = screen.localToWorld(center).sub(group.position);
  expect(Math.atan2(direction.x, -direction.z) * 180 / Math.PI).toBeCloseTo(40);
  expect(box.max.y + 313.4).toBeCloseTo(382.75);
});
