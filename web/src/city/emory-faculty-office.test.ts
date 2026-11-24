import { readFileSync } from 'node:fs';
import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createEmoryFacultyOffice, emoryFacultyOfficeId } from './emory-faculty-office';
import { detachedParts, footprintReport } from './skin-kit';

const site: VBuilding = {
  id: emoryFacultyOfficeId, h: 25.7, floors: null,
  rings: [[[858.17, 90.02], [884.61, 113.17], [913.91, 79.82], [887.24, 56.78], [885, 59.34]]],
};
const ground = new URL('../../../pipeline/prototypes/downtown-ground/', import.meta.url);
const grid = new GroundGrid(
  JSON.parse(readFileSync(new URL('ground.json', ground), 'utf8')),
  Uint8Array.from(readFileSync(new URL('ground.i16', ground))).buffer,
);

it('replaces only the faculty office and keeps the main roof, plant enclosure and headhouse at lidar heights', () => {
  const neighbour = { ...site, id: 'neighbour' };
  const built = createEmoryFacultyOffice([site, neighbour], grid);
  expect(built).not.toBeNull();
  expect(built!.buildings).toEqual([neighbour]);
  expect(createEmoryFacultyOffice([neighbour], grid)).toBeNull();

  const { group } = built!;
  const zero = grid.manifest.vertical.sceneZeroNavd88M;
  group.updateMatrixWorld(true);
  const roofAt = (u: number, v: number) => {
    const origin = new Vector3(u, 400, v).applyMatrix4(group.matrixWorld);
    const hit = new Raycaster(origin, new Vector3(0, -1, 0)).intersectObject(group)[0];
    return hit.point.y + zero;
  };
  expect(roofAt(27, -18)).toBeCloseTo(321.6);
  expect(roofAt(13, -24)).toBeCloseTo(326.0);
  expect(roofAt(5, -12)).toBeCloseTo(329.0);
  expect(footprintReport(group, site.rings, { ...group.userData.footprint, maxProjection: 0.3 }).count).toBe(0);
  expect(detachedParts(group, site.rings)).toEqual([]);
});
