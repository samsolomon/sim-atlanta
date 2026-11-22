import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { connectorTrafficRoutes } from './connector-traffic-routes';
import { ConnectorTraffic, CONNECTOR_TRAFFIC_CAP } from './connector-traffic';
import { connectorLanes } from '../terrain/connector-lanes';
import type { TerrainCity } from '../terrain/transport-data';
import type { P2 } from '../vignette/geom';

const stagedFile = new URL('../../public/data/scene/downtown/vignette.json', import.meta.url);
const staged: TerrainCity | undefined = existsSync(stagedFile)
  ? JSON.parse(readFileSync(stagedFile, 'utf8')) : undefined;
const road = (pts: P2[], sub: string | null = null) => ({
  cls: 'motorway', name: 'Downtown Connector', bridge: false, tunnel: false, sub, pts,
});
const city: TerrainCity = {
  bounds: { minX: -1000, maxX: 1000, minZ: -1300, maxZ: 700 },
  buildings: [], rail: [],
  roads: [
    road([[442,735],[741.07,570.95]]), road([[522,701],[741.07,570.95]], 'link'),
    road([[741.07,570.95],[1030,304]]),
    road([[1022,267],[692.96,562.76]]), road([[692.96,562.76],[422,712]]),
    road([[692.96,562.76],[409,695.5]], 'link'),
  ],
};
const hourly = { weekday: Array(24).fill(1/24), weekend: Array(24).fill(1/24) };
const noon = Date.parse('2026-11-20T17:00:00Z');

describe.skipIf(!staged)('directed motorway chains on the staged City board', () => {
  const city = staged!;
  const routes = staged ? connectorTrafficRoutes(staged) : [];
  it('uses the median and outside positions from the painter in travel order through both sections', () => {
    for (const dir of ['northbound', 'southbound'] as const) {
      const crossing = routes.filter(r => r.crossing && r.direction === dir);
      expect(new Set(crossing.map(r => r.lane)).size).toBe(7);
      expect(crossing.reduce((sum, r) => sum+r.share, 0)).toBeCloseTo(1);
      for (const r of crossing) {
        const indices = [-76,77].map(s => {
          const p = connectorLanes(dir,s)!.centres[r.lane];
          return r.line.pts.findIndex(q => Math.hypot(q[0]-p[0],q[1]-p[1]) < .01);
        });
        expect(Math.min(...indices)).toBeGreaterThan(0);
        expect(indices[1] > indices[0]).toBe(dir === 'northbound');
        if (dir === 'northbound') expect(r.roads[0].sub === 'link').toBe(r.lane >= 5);
        if (dir === 'southbound' && r.lane !== 5) expect(r.roads.at(-1)?.sub === 'link').toBe(r.lane === 6);
      }
    }
  });

  it('includes the separate northern crossing, keeps wraps at the map edge and never draws across the off-board gap', () => {
    for (const dir of ['northbound', 'southbound'] as const) {
      const north = routes.filter(r => !r.crossing && r.direction === dir);
      expect(north).toHaveLength(3);
      for (const r of north) expect(r.line.pts.every(p => p[1] < -740)).toBe(true);
    }
    for (const r of routes) {
      expect(r.roads.length).toBe(r.line.pts.length - 1);
      for (const [x,z] of [r.line.pts[0], r.line.pts.at(-1)!]) {
        const b = city.bounds;
        expect(Math.min(x-b.minX,b.maxX-x,z-b.minZ,b.maxZ-z)).toBeLessThan(8);
      }
      expect(Math.max(...r.line.cum.slice(1).map((v, i) => v-r.line.cum[i]))).toBeLessThan(8);
    }
  });

  it('never spans a missing southern link', () => {
    const roads = city.roads.filter(r => r.pts[0].join(',') !== '741.07,570.95');
    expect(connectorTrafficRoutes({ ...city, roads }).some(r => r.crossing && r.direction === 'northbound')).toBe(false);
  });
});

it.each(['low','high'] as const)('obeys the %s cap and reproduces a paused or rewound clock', quality => {
  const opts = { city, hourly, quality, roadHeight: () => 3 };
  const layer = new ConnectorTraffic(opts);
  const snapshot = () => layer.group.children.map(m => {
    const mesh = m as THREE.InstancedMesh;
    return [...mesh.instanceMatrix.array.slice(0, mesh.count*16)];
  });
  layer.update(noon,.3);
  const first = snapshot();
  expect(layer.visibleCars).toBeGreaterThan(10);
  expect(layer.visibleCars).toBeLessThanOrEqual(CONNECTOR_TRAFFIC_CAP[quality]);
  layer.update(noon,.8);
  expect(snapshot()).toEqual(first);
  expect(layer.night.value).toBe(.8);
  layer.update(noon+1200,.3);
  expect(snapshot()).not.toEqual(first);
  layer.update(noon,.3);
  expect(snapshot()).toEqual(first);
  layer.dispose();
  expect(layer.group.children).toHaveLength(0);
});

it('yields to observed buses and suppresses cars without a supported road surface', () => {
  const height = vi.fn((): number | null => null);
  const occupied = vi.fn(() => true);
  const layer = new ConnectorTraffic({ city, hourly, quality: 'low', roadHeight: height, busOccupies: occupied });
  layer.update(noon,0);
  expect(layer.visibleCars).toBe(0);
  expect(occupied).not.toHaveBeenCalled();
  height.mockReturnValue(1);
  layer.update(noon,0);
  expect(occupied).toHaveBeenCalled();
  expect(layer.visibleCars).toBe(0);
  occupied.mockReturnValue(false);
  layer.update(noon,0);
  expect(layer.visibleCars).toBeGreaterThan(0);
  layer.dispose();
});

it('resolves the road carrying a vehicle across scoped ground, bridge, tunnel and crossing-deck intervals', async () => {
  const { connectorRoadHeight } = await import('./connector-road-height');
  const road = { cls: 'motorway', name: '', bridge: true, tunnel: true, pts: [[0,0],[120,0]] } as TerrainCity['roads'][number];
  const roadHeight = connectorRoadHeight({ ...city, terrainTransport: { version: 1, rail: [], roads: [
    { cls: 'motorway', kind: 'bridge', pts: [[20,-15],[20,15]] },
    { cls: 'motorway', kind: 'ground', pts: [[0,0],[40,0]] },
    { cls: 'motorway', kind: 'bridge', pts: [[75,0],[120,0]] },
  ] } }, () => 2, () => 12);
  expect(roadHeight(20,3.5,road)).toBe(2);
  expect(roadHeight(60,3.5,road)).toBeNull();
  expect(roadHeight(100,3.5,road)).toBe(12);
});

it('follows Atlanta local-hour profiles and treats an absent usable profile as unavailable traffic', () => {
  const weekday = Array(24).fill(0);
  weekday[12] = 1;
  const cfg = {city, quality: 'low' as const, roadHeight: () => 2};
  const layer = new ConnectorTraffic({ ...cfg, hourly: {weekday, weekend: Array(24).fill(0)} });
  layer.update(noon,0);
  expect(layer.visibleCars).toBeGreaterThan(0);
  layer.update(noon+3600000,0);
  expect(layer.visibleCars).toBe(0);
  layer.update(noon+86400000,0);
  expect(layer.visibleCars).toBe(0);
  layer.dispose();
  const missing = new ConnectorTraffic({ ...cfg, hourly:{ weekday:[],weekend:[] } });
  expect(missing.group.children).toHaveLength(0);
  missing.dispose();
});

it.each([
  ['2026-11-20T23:45:00-05:00', 'weekend'],
  ['2026-11-22T23:45:00-05:00', 'weekday'],
] as const)('blends towards the next Atlanta day at %s', (stamp, following) => {
  const hourly = { weekday: Array(24).fill(0), weekend: Array(24).fill(0) };
  hourly[following][0] = 1;
  const layer = new ConnectorTraffic({ city, hourly, quality: 'low', roadHeight: () => 0 });
  layer.update(Date.parse(stamp), 0);
  expect(layer.visibleCars).toBeGreaterThan(0);
  layer.dispose();
});
