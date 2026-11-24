import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Color, Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createMaaMidtown, maaMidtownId } from './maa-midtown';

const buildings: VBuilding[] = JSON.parse(readFileSync(new URL(
  '../../../pipeline/prototypes/square-board/midtown-central/context.json', import.meta.url), 'utf8')).buildings;

/** Flat ground at 303 m NAVD88 around West Peachtree and 11th. */
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 400,
  bounds: { minX: 200, maxX: 600, minZ: -3500, maxZ: -3100 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(3030).buffer);

it('replaces MAA Midtown within the landmark budget at the lidar heights, not the mapped 98 m', () => {
  const site = buildings.find(b => b.id === maaMidtownId)!;
  const model = createMaaMidtown(buildings, site, grid)!;
  expect(model.buildings).toHaveLength(buildings.length - 1);
  const triangles = model.group.children
    .map(child => ((child as Mesh).geometry as BufferGeometry).getAttribute('position').count / 3)
    .reduce((a, b) => a + b, 0);
  expect(triangles).toBeLessThanOrEqual(2400);
  model.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) => {
    const hit = new Raycaster(new Vector3(x, 400, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0];
    return hit ? hit.point.y + 300 : null;
  };
  expect(roof(466, -3178)).toBeCloseTo(381.5, 0); // south block toward Peachtree Walk
  expect(roof(440, -3245)).toBeCloseTo(386.5, 0); // north slab on 11th Street
  expect(roof(476, -3230)).toBeCloseTo(327, 0); // garage podium
  expect(Math.max(...[454, 456, 458].map(x => roof(x, -3228) ?? 0))).toBeCloseTo(389.7, 0); // pavilion
});

it('puts the glass corner on the 11th Street face, not the Peachtree Walk end', () => {
  const model = createMaaMidtown(buildings, buildings.find(b => b.id === maaMidtownId)!, grid)!;
  model.group.updateMatrixWorld(true);
  const colourAt = (origin: Vector3, direction: Vector3) => {
    const hit = new Raycaster(origin, direction).intersectObject(model.group)[0];
    const colour = ((hit.object as Mesh).geometry as BufferGeometry).getAttribute('color');
    return new Color(colour.getX(hit.face!.a), colour.getY(hit.face!.a), colour.getZ(hit.face!.a)).getHexString();
  };
  const corner = new Color('#b0b8bd').getHexString();
  // From 11th Street, looking south at mid-floor height between the white bands.
  expect(colourAt(new Vector3(455, 361.5 - 300, -3300), new Vector3(0, 0, 1))).toBe(corner);
  // From Peachtree Walk, looking north at the other end.
  expect(colourAt(new Vector3(455, 361.5 - 300, -3120), new Vector3(0, 0, -1))).not.toBe(corner);
});
