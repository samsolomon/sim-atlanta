import { Box3, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import type { VBuilding } from '../vignette/world';
import { createSkylineLandmark } from './midtown-skyline';

const row = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-upper/context.json', import.meta.url), 'utf8'));
const tower: VBuilding = row.buildings.find((b: VBuilding) => b.id === 'osm:way:39450314');

it('keeps generic scenery when the upper Midtown footprint or grade is incomplete', () => {
  expect(createSkylineLandmark([tower], tower, null, () => 0)).toBeNull();
  expect(createSkylineLandmark([tower], tower, 0, () => null)).toBeNull();
  const clipped = { ...tower, rings: [tower.rings[0].slice(0, 6)] };
  expect(createSkylineLandmark([clipped], clipped, 0, () => 0)).toBeNull();
});

it('mounts the 250 m landmark on terrain and suppresses the generic roof', () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const bounds = { minX: 350, maxX: 430, minZ: -3730, maxZ: -3650 };
  const grid = new GroundGrid({ version: 1, rows: 17, cols: 17, stepM: 5, bounds, scaleM: .1,
    offsetM: 0, encoding: 'signed int16 little-endian', noData: -32768,
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 }, sha256: '' }, new Int16Array(17 * 17).fill(2820).buffer);
  const area = createDowntownTerrain(grid, { bounds, buildings: [tower], roads: [], rail: [] }, [], { quality: 'low' });
  try {
    const model = area.scenery.getObjectByName('One Atlantic Center')!;
    expect(new Box3().setFromObject(model).max.y).toBeCloseTo(232);
    area.group.updateMatrixWorld(true);
    const ray = new Raycaster(new Vector3(390, 500, -3690), new Vector3(0,-1,0));
    expect(ray.intersectObjects(area.scenery.children.filter(child => child !== model))).toHaveLength(0);
    area.setNight(1);
    expect(((model.children[1] as Mesh).material as MeshLambertMaterial).emissiveIntensity).toBeGreaterThan(0);
  } finally {
    area.dispose();
    vi.unstubAllGlobals();
  }
});

it.each([
  ['osm:way:885660351','1180 Peachtree',200],
  ['osm:way:269636921','Promenade Central',36.2],
  ['osm:way:269637575','Promenade Tower',211],
] as const)('replaces %s at the measured local grade', (id, name, height) => {
  const building: VBuilding = row.buildings.find((b: VBuilding) => b.id === id);
  const model = createSkylineLandmark([building,tower], building, -8, () => -3)!;
  expect(model.group.name).toBe(name);
  expect(model.buildings).toEqual([tower]);
  expect(new Box3().setFromObject(model.group).max.y).toBeCloseTo(height-3);
});

it('keeps the historic Georgian Terrace lower than its mapped rear addition', () => {
  const south = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-south/context.json', import.meta.url), 'utf8'));
  const hotel: VBuilding = south.buildings.find((b: VBuilding) => b.id === 'osm:way:886041064');
  const model = createSkylineLandmark([hotel], hotel, -5, () => 0)!;
  model.group.updateMatrixWorld(true);
  const heightAt = (x: number,z: number) => new Raycaster(new Vector3(x,150,z),new Vector3(0,-1,0)).intersectObject(model.group)[0].point.y;
  expect(heightAt(642,-2070)).toBeCloseTo(37.12);
  expect(heightAt(701,-2108)).toBeCloseTo(68);
  // Mapped three-storey podium east of the addition, and the raised Peachtree terrace.
  expect(heightAt(712.5,-2110)).toBeGreaterThan(11);
  expect(heightAt(712.5,-2110)).toBeLessThan(13);
  expect(heightAt(635,-2060)).toBeCloseTo(1.35);
});

it('raises the Georgian Terrace deck to the Peachtree grade', () => {
  const south = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-south/context.json', import.meta.url), 'utf8'));
  const hotel: VBuilding = south.buildings.find((b: VBuilding) => b.id === 'osm:way:886041064');
  // Ground rises 2.5 m from the site centre to the Peachtree sidewalk.
  const model = createSkylineLandmark([hotel], hotel, -5, (x) => x < 640 ? 2.5 : 0)!;
  model.group.updateMatrixWorld(true);
  const hit = new Raycaster(new Vector3(635,150,-2060),new Vector3(0,-1,0)).intersectObject(model.group)[0];
  expect(hit.point.y).toBeCloseTo(2.8);
});
