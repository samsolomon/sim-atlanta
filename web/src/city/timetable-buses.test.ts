import { it, expect } from 'vitest';
import { createTimetableBuses } from './timetable-buses';
import { CityBuses } from './buses';
import { cityBusGeometry } from '../vignette/xcelsior';
import { sceneToLonLat } from '../core/places';
import type { BusTimetableFile, LiveBus } from '../model/types';

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
  let serviceDate;
  const poses = model.posesAt(time, (day) => {
    serviceDate = day;
  });
  expect(serviceDate).toBe(20261119);
  expect(poses).toHaveLength(1);
  streets.timetable(poses);
  expect(streets.positions[0].y).toBe(8);
  expect(streets.positions[0].z).toBeCloseTo(45, 0);
  expect(model.posesAt(time + 86400000)).toEqual([]);
  expect(model.posesAt(time)).toEqual(poses);
  const mixed = createTimetableBuses({...data, tripIds:['first','second'], timetable: {
    ...data.timetable, trips: [[0, 0, start, ''], [0, 0, start + 10, '']]
  }}, origin, streets, [], []);
  const [lon,lat] = sceneToLonLat(origin, 0, 42);
  const live = <T>(value:T) => ({value, tier:'live' as const, source:'marta-bus-rt', asOf:new Date(time).toISOString()});
  const fix: LiveBus = {id:'marta:bus:123', tripId:'first', startDate:'20261119',
    at:time, position:live({lon,lat}), routeId:live('marta:route:49'), speed:live(2)};
  const present = (fixes: LiveBus[]) => mixed.presentAt(time,time,fixes);
  const pair = present([fix]);
  expect(pair.poses.map(p => [p.fix?.id, !!p.fallback])).toEqual([[fix.id,false],[undefined,true]]);
  expect(pair.raw).toHaveLength(0);
  const sameTrip = present([fix,{...fix,id:'marta:bus:456'}]);
  expect(sameTrip.poses.filter(p=>p.fix)).toHaveLength(1);
  for (const reports of [[], [{...fix,at:time-180001}]]) {
    expect(present(reports).poses.map(p=>[p.id,p.fallback])).toEqual([
      [pair.poses[0].id,true], [pair.poses[1].id,true]
    ]);
  }
  const unassigned = present([{...fix,tripId:'unmatched'}]);
  expect(unassigned.poses).toHaveLength(2);
  expect(unassigned.poses.filter(p=>p.fallback)).toHaveLength(1);
  streets.dispose();
});

it('shows a 25:15 scheduled start on the next Atlanta date', async () => {
  const { timetableBusCard } = await import('../map/card');
  expect(timetableBusCard({ headsign: 'North', start: 25 * 3600 + 15 * 60, serviceDate: 20261130 })).toContain(
    '2026-12-01 at 1:15',
  );
});

it('labels a drawn GPS location and a present-clock fallback separately', async () => {
  const {busCard, timetableBusCard} = await import('../map/card');
  const fix: LiveBus = {id:'marta:bus:3',at:1000,position:{value:{lon:0,lat:0},tier:'live',source:'gps',asOf:''}};
  expect(busCard(fix,41000,'XN40',59.6)).toContain('GPS 40 s ago · drawn about 60 m from the last fix');
  expect(busCard(fix,41000,'XN40',59.6)).toContain('chip live');
  const html = timetableBusCard({headsign:'North',start:0,serviceDate:20261123,fallback:true});
  expect(html).toContain('No live GPS for this trip');
  expect(html).toContain('chip inferred');
  expect(html).not.toContain('chip live');
});
