import Pbf from 'pbf';
import type { BusFeed, BusRoutes, BusFix } from '../../web/src/model/types';

export const BUS_URL = 'https://gtfs-rt.itsmarta.com/TMGTFSRealTimeWebService/vehicle/vehiclepositions.pb';

interface Fix {
  id?: string;
  route?: string;
  at?: number;
  lat?: number;
  lon?: number;
  bearing?: number;
  speed?: number;
}

// Field numbers from gtfs-realtime.proto. Pbf skips unconsumed optional fields.
function vehicle(tag: number, fix: Fix, reader: Pbf) {
  if (tag === 1) reader.readMessage((field, f, r) => {
    if (field === 5) f.route = r.readString();
  }, fix);
  if (tag === 2) reader.readMessage((field, f, r) => {
    if (field === 1) f.lat = r.readFloat();
    if (field === 2) f.lon = r.readFloat();
    if (field === 3) f.bearing = r.readFloat();
    if (field === 5) f.speed = r.readFloat();
  }, fix);
  if (tag === 5) fix.at = reader.readVarint() * 1000;
  if (tag === 8) reader.readMessage((field, f, r) => {
    if (field === 1) f.id = r.readString();
  }, fix);
}

export function normalizeBuses(bytes: ArrayBuffer, routes: BusRoutes, fetched: number): BusFeed {
  const buses = new Map<string, BusFix>();
  new Pbf(bytes).readFields((tag, _, reader) => {
    if (tag !== 2) return;
    const fix = reader.readMessage<Fix>((field, f, r) => {
      if (field === 4) r.readMessage(vehicle, f);
    }, {});
    const { id, lat, lon } = fix;
    if (!id || lat == null || lon == null || !(Math.abs(lat) <= 90 && Math.abs(lon) <= 180) || (lat === 0 && lon === 0)) return;
    const at = fix.at ?? null;
    if (buses.has(id) && (buses.get(id)!.at ?? -1) >= (at ?? -1)) return;
    const name = fix.route && Object.hasOwn(routes, fix.route) ? routes[fix.route] : undefined;
    buses.set(id, {
      id: `marta:bus:${id}`, at, lon: Number(lon.toFixed(5)), lat: Number(lat.toFixed(5)),
      routeId: name ? `marta:route:${name}` : undefined,
      bearing: fix.bearing != null && fix.bearing >= 0 && fix.bearing < 360 ? Math.round(fix.bearing) % 360 : undefined,
      speed: fix.speed != null && Number.isFinite(fix.speed) && fix.speed >= 0 ? Math.round(fix.speed) : undefined,
    });
  }, null);
  return { source: 'marta-bus-rt', fetched, buses: [...buses.values()] };
}
