/**
 * MARTA rail realtime → normalized live train list.
 *
 * The REST API returns one row per (train, upcoming station) prediction. Each row
 * repeats the train's current GPS position, so we group by TRAIN_ID and keep the
 * soonest realtime prediction as "next stop".
 */

export const MARTA_RAIL_URL =
  'https://developerservices.itsmarta.com:18096/itsmarta/railrealtimearrivals/developerservices/traindata';

export interface MartaRow {
  DESTINATION: string;
  DIRECTION: string;
  EVENT_TIME: string; // "11/20/2026 2:59:25 PM" (Eastern)
  IS_REALTIME: string; // "true" | "false"
  LINE: string; // RED | GOLD | BLUE | GREEN
  NEXT_ARR: string;
  STATION: string;
  TRAIN_ID: string;
  WAITING_SECONDS: string;
  DELAY: string;
  LATITUDE: string;
  LONGITUDE: string;
}

export interface LiveTrain {
  id: string; // "marta:train:409"
  line: string; // "RED"
  direction: string; // N | S | E | W
  destination: string;
  lat: number;
  lon: number;
  /** When MARTA recorded this position (ms since epoch). */
  at: number;
  nextStation?: string;
  nextInSec?: number;
}

export interface LiveFeed {
  source: 'marta-rail-rt';
  fetched: number;
  trains: LiveTrain[];
}

/** Parse MARTA's Eastern-time "M/D/YYYY h:mm:ss AM" into epoch ms, DST-aware. */
export function parseEastern(s: string): number | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) (AM|PM)$/.exec(s.trim());
  if (!m) return null;
  let h = Number(m[4]) % 12;
  if (m[7] === 'PM') h += 12;
  const wall = Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2]), h, Number(m[5]), Number(m[6]));
  // Find the New York offset at (approximately) that instant.
  const offsetMin = (at: number) => {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' })
      .formatToParts(new Date(at))
      .find((p) => p.type === 'timeZoneName')!.value; // "GMT-5"
    const o = /GMT([+-]\d+)(?::(\d+))?/.exec(name);
    return o ? Number(o[1]) * 60 + Math.sign(Number(o[1])) * Number(o[2] ?? 0) : 0;
  };
  const guess = wall - offsetMin(wall) * 60_000;
  return wall - offsetMin(guess) * 60_000;
}

export function normalize(rows: MartaRow[], fetched: number): LiveFeed {
  const byTrain = new Map<string, MartaRow[]>();
  for (const r of rows) {
    if (!r.TRAIN_ID || !r.LATITUDE || !r.LONGITUDE) continue;
    const list = byTrain.get(r.TRAIN_ID) ?? [];
    list.push(r);
    byTrain.set(r.TRAIN_ID, list);
  }
  const trains: LiveTrain[] = [];
  for (const [id, list] of byTrain) {
    const lat = Number(list[0].LATITUDE);
    const lon = Number(list[0].LONGITUDE);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat === 0) continue;
    const at = Math.max(...list.map((r) => parseEastern(r.EVENT_TIME) ?? 0));
    const next = list
      .filter((r) => r.IS_REALTIME === 'true')
      .sort((a, b) => Number(a.WAITING_SECONDS) - Number(b.WAITING_SECONDS))[0];
    trains.push({
      id: `marta:train:${id}`,
      line: list[0].LINE.toUpperCase(),
      direction: list[0].DIRECTION,
      destination: list[0].DESTINATION,
      lat,
      lon,
      at: at || fetched,
      nextStation: next?.STATION,
      nextInSec: next ? Number(next.WAITING_SECONDS) : undefined,
    });
  }
  trains.sort((a, b) => a.id.localeCompare(b.id));
  return { source: 'marta-rail-rt', fetched, trains };
}
