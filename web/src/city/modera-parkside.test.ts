import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createModeraParkside, moderaParksideId } from './modera-parkside';

const buildings: VBuilding[] = JSON.parse(readFileSync(new URL(
  '../../../pipeline/prototypes/square-board/midtown-central/context.json', import.meta.url), 'utf8')).buildings;

/** Flat ground at 290 m NAVD88 around 10th Street. */
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 400,
  bounds: { minX: 750, maxX: 1150, minZ: -3350, maxZ: -2950 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(2900).buffer);

it('runs the pergola slats from one side of the crown frame to the other', () => {
  const site = buildings.find(b => b.id === moderaParksideId)!;
  const model = createModeraParkside(buildings, site, grid)!;
  model.group.updateMatrixWorld(true);
  // Straight down on the northernmost-but-one run of slats, in the tower's local metres.
  const top = (u: number, v: number) =>
    new Raycaster(new Vector3(948 + u, 400, -3150 + v), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y;
  const v = -15 + 9 * 2.2 + .17;
  const band = top(15.8, v);
  for (const u of [-12, 0, 14.5, 15]) expect(top(u, v), `u=${u}`).toBeCloseTo(band, 2);
});
