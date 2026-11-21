import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from './grid';
import { createSurfaceTransport } from './transport';
import type { TerrainCity } from './transport-data';

const folder = new URL('../../../pipeline/prototypes/downtown-ground/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('ground.json', folder), 'utf8'));
const grid = new GroundGrid(manifest, new Uint8Array(readFileSync(new URL('ground.i16', folder))).buffer);
const zero = grid.manifest.vertical.sceneZeroNavd88M;
const groundAt = (x: number, z: number) => {
  const value = grid.sample(x, z);
  return value === null ? null : value - zero;
};
const city: TerrainCity = { bounds: manifest.bounds, roads: [], rail: [], buildings: [],
  terrainTransport: { version: 1, roads: [
    { cls: 'secondary', kind: 'bridge', pts: [[803.92,449.42],[817.68,452.25],[833.03,453.64],[857.01,454],[920.09,454.95]] },
  ], rail: [
    { cls: 'standard_gauge', kind: 'bridge', pts: [[707.43,519.57],[740.44,531.22],[796.12,547.47],[820.94,553.24]] },
  ] } };

function surfaceY(group: THREE.Group, x: number, z: number) {
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
  return ray.intersectObject(group, true)[0]?.point.y;
}

it('puts both mapped decks over the freeway and below the schematic layer-3 Blue Line', () => {
  const transport = createSurfaceTransport(city, grid, groundAt);
  // Intersections of the scoped Overture spans and the western Connector carriageway.
  const freight = surfaceY(transport.group, 743.7095, 532.1742)!;
  const decatur = surfaceY(transport.group, 835.7977, 453.6815)!;
  expect(freight + zero).toBeCloseTo(312.3, 1);
  expect(decatur + zero).toBeCloseTo(309.8, 0);
  expect(freight - groundAt(743.7095, 532.1742)!).toBeGreaterThan(8);
  expect(decatur - groundAt(835.7977, 453.6815)!).toBeGreaterThan(7);
  // Control's Connector study uses the east bank + 7 m at s = 8284.4 m.
  const blue = groundAt(820, 555)! + 7;
  expect(blue).toBeGreaterThan(freight);
  expect(blue).toBeGreaterThan(decatur);
  expect(transport.structuralTier).toBe('illustrative');
  new THREE.Scene().add(transport.group);
  transport.dispose();
  expect(transport.group.parent).toBeNull();
  expect(transport.group.children).toHaveLength(0);
});

it('follows the board on open track, breaks at a void, and keeps the supported span over it', () => {
  const t = createSurfaceTransport({ ...city, terrainTransport: {
    version: 1, roads: [], rail: [
      ...city.terrainTransport!.rail,
      { cls: 'standard_gauge', kind: 'ground', pts: [[700, 560], [800, 560]] },
      { cls: 'tram', kind: 'ground', pts: [[700, 580], [800, 580]] },
    ],
  } }, grid, x => x >= 735 && x <= 755 ? null : -16);
  expect(surfaceY(t.group, 730, 560)).toBeCloseTo(-16 + .13);
  expect(surfaceY(t.group, 740, 560)).toBeUndefined();
  expect(surfaceY(t.group, 730, 580)).toBeUndefined(); // no tram ballast
  expect(surfaceY(t.group, 730, 580.7175)).toBeCloseTo(-16 + .075);
  expect(surfaceY(t.group, 740, 580.7175)).toBeUndefined();
  expect(surfaceY(t.group, 743.7095, 532.1742)! + zero).toBeCloseTo(312.3, 1);
  t.dispose();
});
