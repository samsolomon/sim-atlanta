import { it, expect } from 'vitest';
import { createTimetableBuses } from './timetable-buses';
import { CityBuses } from './buses';
import { cityBusGeometry } from '../vignette/xcelsior';
import { sceneToLonLat } from '../core/places';
import type { BusTimetableFile } from '../model/types';

it('keeps yesterday’s added after-midnight trip on its owned deck, with a stable id across seeks', () => {
  const origin = { lon: -84.39, lat: 33.75 },
    start = 25 * 3600;
  const data: BusTimetableFile = {
    source: { url: '', retrieved: '', sha256: '' },
    routes: [],
    stops: [],
    paths: [
      {
        id: 'path',
        routeId: 'marta:route:49',
        coords: [...sceneToLonLat(origin, 0, 0), ...sceneToLonLat(origin, 0, 100)],
        cum: [0, 100],
      },
    ],
    timetable: {
      feed: 'marta',
      timezone: 'America/New_York',
      patterns: [
        {
          id: 'p',
          routeId: 'marta:route:49',
          pathId: 'path',
          headsign: 'South',
          stops: ['a', 'b'],
          dist: [0, 100],
          arr: [0, 100],
          dep: [0, 100],
        },
      ],
      services: [{ id: 's', start: 20261119, end: 20261119, days: 0, added: [20261119], removed: [] }],
      trips: [[0, 0, start, '']],
    },
  };
  const streets = new CityBuses({
    origin,
    bounds: { minX: -20, maxX: 20, minZ: -10, maxZ: 110 },
    runs: [
      {
        kind: 'bridge',
        cls: 'primary',
        pts: [
          [0, 0],
          [0, 100],
        ],
      },
    ],
    deckAt: () => 8,
    groundAt: () => 1,
    geometry: cityBusGeometry(),
  });
  expect(streets.mesh.geometry.attributes.position.count / 3).toBeLessThanOrEqual(1000);
  const model = createTimetableBuses(data, origin, streets, [], []);
  const time = Date.parse('2026-11-20T01:00:45-05:00');
  const poses = model.posesAt(time);
  expect(poses).toHaveLength(1);
  streets.timetable(poses);
  expect(streets.positions[0].y).toBe(8);
  expect(streets.positions[0].z).toBeCloseTo(45, 0);
  expect(model.posesAt(time + 86400000)).toEqual([]);
  expect(model.posesAt(time)).toEqual(poses);
  streets.dispose();
});

it('shows a 25:15 scheduled start on the next Atlanta date', async () => {
  const { timetableBusCard } = await import('../map/card');
  expect(timetableBusCard({headsign:'North',start:25*3600+15*60,serviceDate:20261130})).toContain('2026-12-01 at 1:15');
});
