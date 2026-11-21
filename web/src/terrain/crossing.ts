import * as THREE from 'three';
import { CityTrains } from '../city/trains';
import { makeProjector, type SceneManifest } from '../core/scene-data';
import type { RoutesFile, TimetableFile, VehicleType } from '../model/types';
import { Schedule } from '../sched/engine';
import { alignment } from '../vignette/alignment';
import { Line, type P2 } from '../vignette/geom';
import { World, type VData } from '../vignette/world';
import type { GroundGrid } from './grid';

const mid = Date.parse('2026-11-20T14:12:49-05:00');
const bounds = { minX: 420, maxX: 985, minZ: 300, maxZ: 680 };

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} (${r.status})`);
  return r.json();
}

// World clips at vertices. Sample sparse bridge ways so spans crossing the edge survive.
function sampleWay(points: P2[]): P2[] {
  const line = new Line(points);
  if (!line.length) return points;
  const samples: P2[] = [];
  for (let s = 0; s < line.length; s += 5) {
    const p = line.at(s);
    samples.push([p.x, p.z]);
  }
  return [...samples, points[points.length - 1]];
}

export async function connectorCrossing(grid: GroundGrid, city: VData) {
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
  const datum = bank;
  class CrossingWorld extends World {
    override ground(x: number, z: number) {
      const h = grid.sample(x, z);
      if (h === null) throw new Error('Missing ground under the crossing');
      return h - datum;
    }
  }
  const data = { bounds, buildings: [],
    roads: city.roads.filter(r => r.bridge || r.cls === 'motorway').map(r => ({ ...r, pts: sampleWay(r.pts) })),
    rail: city.rail.filter(r => r.cls === 'standard_gauge' && r.flags.includes('is_bridge')).map(r => ({ ...r, pts: sampleWay(r.pts) })),
  };
  const world = new CrossingWorld(data, null, { terrain: 'flat', clumps: 4, lightMapMax: 256 });
  const al = alignment(routes, manifest, city.bounds, trip.pathId);
  world.buildStreets();
  world.buildFreight();
  world.buildMarta(al);
  const trains = new CityTrains([al], manifest, bounds, new Map(routes.routes.map(r => [r.id, r.color])), []);
  world.group.add(trains.group);
  world.group.position.y = datum - grid.manifest.vertical.sceneZeroNavd88M;
  function pose(seconds: number) {
    const state = schedule.trainsAt(new Date(mid + seconds * 1000)).filter(t => t.id === tripId);
    trains.update(state, 0);
  }
  pose(0);
  return { group: world.group, pose };
}
