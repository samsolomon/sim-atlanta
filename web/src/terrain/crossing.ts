import * as THREE from 'three';
import { CityTrains } from '../city/trains';
import { makeProjector, type SceneManifest } from '../core/scene-data';
import type { RoutesFile, TimetableFile, VehicleType } from '../model/types';
import { Schedule } from '../sched/engine';
import { alignment } from '../vignette/alignment';
import { World, trackInDaylight, type Alignment } from '../vignette/world';
import type { GroundGrid } from './grid';
import { createSurfaceTransport } from './transport';
import type { TerrainCity } from './transport-data';

const mid = Date.parse('2026-11-20T14:12:49-05:00');
const bounds = { minX: 420, maxX: 985, minZ: 300, maxZ: 680 };

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} (${r.status})`);
  return r.json();
}

export async function connectorCrossing(grid: GroundGrid, city: TerrainCity, groundAt: (x: number, z: number) => number | null) {
  const [routes, table, vehicles, manifest] = await Promise.all([
    json<RoutesFile>('/data/ga/routes.json'), json<TimetableFile>('/data/ga/timetable.json'),
    json<VehicleType[]>('/data/ga/vehicle-types.json'), json<SceneManifest>('/data/scene/downtown/scene.json'),
  ]);
  const schedule = new Schedule(routes, table, vehicles);
  const project = makeProjector(manifest.origin);
  const trip = schedule.trainsAt(new Date(mid)).find(t => {
    const [x, z] = project(t.lon, t.lat);
    return t.routeId === 'marta:route:BLUE' && t.heading < 180 && Math.hypot(x - 755, z - 555) < 100;
  });
  if (!trip || !manifest.profiles[trip.pathId]) throw new Error('This timetable has no profiled Blue Line trip at the replay time.');

  const tripId = trip.id;
  const bank = grid.sample(820, 555);
  if (bank === null) throw new Error('Missing east bank elevation');
  // City’s existing structural heights use a local zero. Anchor that zero once at the east
  // bank. Sampling the DEM along the deck would bend it into the freeway trench.
  const sceneZero = grid.manifest.vertical.sceneZeroNavd88M;
  const bankY = bank - sceneZero;
  class CrossingWorld extends World {
    override ground(x: number, z: number) {
      const h = grid.sample(x, z);
      if (h === null) throw new Error('Missing ground under the crossing');
      return h - sceneZero;
    }
  }
  const legacy = alignment(routes, manifest, city.bounds, trip.pathId);
  const al: Alignment = {
    line: legacy.line,
    elev: s => bankY + legacy.elev(s),
    referenceY: () => bankY,
    openToSky: s => trackInDaylight(legacy, s),
  };
  const rail = new CrossingWorld({ ...city, bounds }, null, { terrain: 'flat', clumps: 4, lightMapMax: 256 });
  rail.buildMarta(al);
  const trains = new CityTrains([al], manifest, bounds, new Map(routes.routes.map(r => [r.id, r.color])), []);
  const group = new THREE.Group();
  const transport = createSurfaceTransport(city, grid, groundAt);
  group.add(transport.group, rail.group, trains.group);
  function pose(seconds: number) {
    const state = schedule.trainsAt(new Date(mid + seconds * 1000)).filter(t => t.id === tripId);
    trains.update(state, 0);
  }
  pose(0);
  return { group, pose };
}
