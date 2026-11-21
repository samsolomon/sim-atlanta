import Pbf from 'pbf';
import { expect, it } from 'vitest';
import { normalizeBuses } from './bus';

function encodedFix(at?: number) {
  const feed = new Pbf();
  feed.writeMessage(2, (_, entity) => {
    entity.writeStringField(1, 'entity-id');
    entity.writeMessage(4, (_, vehicle) => {
      vehicle.writeMessage(1, (_, trip) => trip.writeStringField(5, '29130'), null);
      vehicle.writeMessage(8, (_, descriptor) => descriptor.writeStringField(1, '2303'), null);
      vehicle.writeMessage(2, (_, position) => {
        position.writeFloatField(1, 33.75);
        position.writeFloatField(2, -84.375);
        position.writeFloatField(3, 0);
        position.writeFloatField(5, 0);
      }, null);
      if (at !== undefined) vehicle.writeVarintField(5, at);
    }, null);
  }, null);
  return Uint8Array.from(feed.finish()).buffer;
}

it('decodes the vehicle ID, observed position, matched static route and explicit zero values', () => {
  const [bus] = normalizeBuses(encodedFix(1700000000), { 'marta:route:29130': '1' }, 99).buses;
  expect(bus).toEqual({
    id: 'marta:bus:2303', at: 1700000000000,
    lat: 33.75, lon: -84.375,
    bearing: 0, speed: 0,
    routeId: 'marta:route:29130',
  });
});

it('preserves a missing observation time and omits unmatched routes', () => {
  const [bus] = normalizeBuses(encodedFix(), {}, Date.now()).buses;
  expect(bus.at).toBeNull();
  expect(bus.routeId).toBeUndefined();
});
