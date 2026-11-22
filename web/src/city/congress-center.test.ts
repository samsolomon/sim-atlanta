import { readFileSync } from 'node:fs';
import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createCongressCenter } from './congress-center';

const data = new URL('../../../pipeline/prototypes/downtown-ground/', import.meta.url);
const campus: VBuilding = JSON.parse(readFileSync(new URL('./fixtures/congress-center-footprint.json', import.meta.url), 'utf8'));
const buildings = [campus, { ...campus, id: 'neighbor' }];
const manifest = JSON.parse(readFileSync(new URL('ground.json', data), 'utf8'));
const bytes = new Uint8Array(readFileSync(new URL('ground.i16', data)));
const grid = new GroundGrid(manifest, bytes.buffer);
const model = createCongressCenter(buildings, grid)!;
model.group.updateMatrixWorld(true);
function ray(x: number, y: number, z: number, direction: number) {
  return new Raycaster(new Vector3(x, y, z), new Vector3(0, direction, 0)).intersectObject(model.group)[0];
}

it('finds the registered exhibit roofs on all three wings and replaces only the named parent', () => {
  expect(buildings.filter(b => !model.buildings.includes(b)).map(b => b.id)).toEqual(['46ba7ea2-3735-47a8-b77d-997b486ea866']);
  // A1–3, B1–5, C1–4 and BC. Interior hall divisions share continuous roof plates.
  for (const [x, z, top] of [
    [-500, -593, 35], [-500, -702, 35], [-500, -780, 35], [-680, -605, 31], [-680, -701, 31], [-680, -779, 31],
    [-680, -866, 33.2], [-680, -998, 33.2], [-898, -717, 28], [-898, -789, 28], [-898, -871, 28], [-898, -948, 28], [-789, -906, 26.2],
  ]) expect(ray(x, 100, z, -1).point.y - model.group.position.y).toBeCloseTo(top, 1);
});

it('keeps both inner courts and the rail corridor open while carrying the southern lobby overhead', () => {
  for (const [x, z] of [[-778, -750], [-783, -822], [-571, -700]]) expect(ray(x, 100, z, -1)).toBeUndefined();
  expect(model.apron.rings[0]).toBe(buildings.find(b => b.id === '46ba7ea2-3735-47a8-b77d-997b486ea866')!.rings[1]);
  const x = -570, z = -518, terrain = grid.sample(x, z)! - manifest.vertical.sceneZeroNavd88M;
  expect(ray(x, 100, z, -1).point.y - model.group.position.y).toBeCloseTo(21, 3);
  const underside = ray(x, terrain + 0.1, z, 1).point.y;
  expect(underside - model.group.position.y).toBeCloseTo(18.6, 3);
  expect(underside - terrain).toBeGreaterThan(5);
  // A's slightly skew west wall enters the same x band 180 m north of the bridge.
  const wall = new Raycaster(new Vector3(-556, model.group.position.y + 14, -700), new Vector3(1,0,0))
    .intersectObject(model.group)[0];
  expect(wall.point.x).toBeCloseTo(-554.25, 1);
});

it('preserves fallback for an absent campus, missing courtyard or no-data on the source outline', () => {
  const campus = buildings.find(b => b.id === '46ba7ea2-3735-47a8-b77d-997b486ea866')!;
  expect(createCongressCenter(model.buildings, grid)).toBeNull();
  expect(createCongressCenter([{ ...campus, rings: [campus.rings[0]] }], grid)).toBeNull();
  const copy = bytes.slice(), [x, z] = campus.rings[0][0];
  const row = Math.floor((z - manifest.bounds.minZ) / manifest.stepM), col = Math.floor((x - manifest.bounds.minX) / manifest.stepM);
  new DataView(copy.buffer).setInt16(2 * (row * manifest.cols + col), manifest.noData, true);
  expect(createCongressCenter(buildings, new GroundGrid(manifest, copy.buffer))).toBeNull();
});
