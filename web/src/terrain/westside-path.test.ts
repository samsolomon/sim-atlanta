import { expect, it } from 'vitest';
import type { VRoad } from '../vignette/world';
import type { P2 } from '../vignette/geom';
import { roadWidth, type TerrainCity, type TransportRun } from './transport-data';
import { westsideName, westsidePaths } from './westside-path';

it('carries the named sidepath across both transport intervals and leaves the other sidewalk alone', () => {
  const pts: P2[] = [[-771, -1094], [-648, -1106], [-569, -1121]];
  const source: VRoad = { name: westsideName, cls: 'footway', sub: 'sidewalk', pts, bridge: true, tunnel: false };
  const approach: TransportRun = { cls: 'footway', kind: 'ground', pts: pts.slice(0, 2) };
  const deck: TransportRun = { ...approach, kind: 'bridge', pts: pts.slice(1) };
  const opposite: TransportRun = { ...deck, pts: deck.pts.map(([x, z]) => [x, z - 21]) };
  const ramp: VRoad = { ...source, bridge: false, sub: 'crosswalk' };
  const city: TerrainCity = { bounds: { minX: -1000, maxX: 1000, minZ: -1300, maxZ: 700 },
    buildings: [], rail: [], roads: [source, ramp], terrainTransport: { version: 1, roads: [approach, deck, opposite], rail: [] } };
  expect(westsidePaths(city)).toEqual(new Set([source, approach, deck]));
});

it('uses a two-lane width for each mapped Ivan Allen carriageway approaching Mangum', () => {
  const road = { name: 'Ivan Allen Junior Boulevard', cls: 'secondary', pts: [[-789.09, -1099.14], [-648.54, -1117.74]] as P2[] };
  expect(roadWidth(road)).toBe(7.2);
  expect(roadWidth({ ...road, name: null })).toBe(11);
  expect(roadWidth({ ...road, pts: [[-648.54, -1117.74], [-524.48, -1152.33]] })).toBe(11);
});
