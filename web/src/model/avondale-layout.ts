/**
 * Avondale (MARTA E7): a source fixture for the shared platform primitive. It holds four tracks
 * and two island platforms. Sources and limits are in docs/avondale-layout.md, and the tests are
 * in avondale-layout.test.ts.
 *
 * It keeps three kinds of fact apart:
 * - The physical layout (AVONDALE_LAYOUT): which track faces which platform edge. It assigns no
 *   trains.
 * - Known service (AVONDALE_SERVICE): which platform each scheduled pattern calls at. That comes
 *   from GTFS stop_ids, so its tier is scheduled.
 * - Track per trip: GTFS doesn't publish it. Each pattern carries the physically possible tracks,
 *   plus a usual track whose tier is inferred, never live or scheduled.
 *
 * `side` is the platform's side of the track when facing along the station's reference axis,
 * which is eastbound (toward Kensington/Indian Creek, bearing ≈ 67.5°). Travel +1 is eastbound.
 * Travel −1 swaps the door side.
 */

export type AvondaleTrack = 'EL' | 'WB' | 'EB' | 'ER';
export type Side = 'left' | 'right';

/** Structural StationLayout (web/src/model/platforms.ts once the shared primitive merges). */
export const AVONDALE_LAYOUT = {
  id: 'marta:station:avondale',
  /** North to south: westbound main, the two centre tracks, eastbound main. */
  tracks: ['EL', 'WB', 'EB', 'ER'],
  platforms: [
    // North island; GTFS stop 908691 (westbound calls).
    { id: 'marta:stop:908691', edges: [{ trackId: 'EL', side: 'right' }, { trackId: 'WB', side: 'left' }] },
    // South island; GTFS stop 908438 (eastbound calls).
    { id: 'marta:stop:908438', edges: [{ trackId: 'EB', side: 'right' }, { trackId: 'ER', side: 'left' }] },
  ],
} as const satisfies {
  id: string;
  tracks: readonly string[];
  platforms: readonly { id: string; edges: readonly { trackId: string; side: Side }[] }[];
};

type LonLat = readonly [number, number];

/**
 * Physical evidence: OSM ways and the lateral offset from the station node, in metres.
 * Positive is right of eastbound, i.e. south. OSM was read on 2026-11-22.
 */
export const AVONDALE_PHYSICAL = {
  checked: '2026-11-22',
  station: { osm: 'osm:node/4172458457', stopArea: 'osm:relation/4439497', lonLat: [-84.2822446, 33.7751541] as LonLat, ref: 'E7' },
  axisBearingDeg: 67.5,
  /** Lateral precision of the OSM geometry against Esri World Imagery (canopy roofs, track beds). */
  precisionM: 3,
  tracks: {
    EL: { role: 'main', osm: ['osm:way/40894429'], v: -13.5, tags: 'railway:track_ref=EL, usage=main' },
    WB: { role: 'centre', osm: ['osm:way/905946827', 'osm:way/905879577'], v: -2.2, tags: 'railway:track_ref=WB, service=yard' },
    EB: { role: 'centre', osm: ['osm:way/905946828', 'osm:way/905879576'], v: 2.2, tags: 'railway:track_ref=EB, service=yard' },
    ER: { role: 'main', osm: ['osm:way/24850628'], v: 13.5, tags: 'railway:track_ref=ER, usage=main' },
  } satisfies Record<AvondaleTrack, { role: 'main' | 'centre'; osm: string[]; v: number; tags: string }>,
  /** The centre tracks reach the mains via this crossover 110–180 m west, and run east into Avondale Yard. */
  crossover: ['osm:way/78044276', 'osm:way/78044278'],
  yard: 'osm:way/171606146',
  platforms: {
    'marta:stop:908691': {
      osm: 'osm:way/78044271', vRange: [-11.6, -4.0], lengthM: 180,
      ring: [[-84.283146, 33.774882], [-84.283177, 33.774942], [-84.28138, 33.775564], [-84.28135, 33.775504], [-84.281924, 33.775306], [-84.282395, 33.775142], [-84.282452, 33.775123]] as LonLat[],
    },
    'marta:stop:908438': {
      osm: 'osm:way/78044272', vRange: [3.9, 11.8], lengthM: 181,
      ring: [[-84.283115, 33.774814], [-84.283084, 33.774751], [-84.281279, 33.775372], [-84.281313, 33.775437], [-84.281892, 33.775237], [-84.282363, 33.775074], [-84.282418, 33.775055]] as LonLat[],
    },
  },
} as const;

export type Tier = 'scheduled' | 'inferred' | 'reported';

export interface AvondaleService {
  id: string;
  label: string;
  routeId: string;
  /** Present in the staged GTFS feed? A pattern that isn't must never be drawn as scheduled. */
  inCurrentFeed: boolean;
  /** Platform called at; the tier says how we know. */
  platform: { id: string; tier: Tier };
  travel: 1 | -1;
  /** Every track that physically faces that platform. Per-trip assignment is unknown. */
  candidates: readonly AvondaleTrack[];
  /** The normal track, with its tier, or null when nothing supports one. */
  usual: { track: AvondaleTrack; tier: Tier } | null;
  role: 'through' | 'terminates' | 'originates';
  evidence: readonly string[];
}

export const AVONDALE_SERVICE = [
  {
    id: 'blue-eastbound', label: 'Blue Line eastbound to Indian Creek (through)', routeId: 'marta:route:BLUE', inCurrentFeed: true,
    platform: { id: 'marta:stop:908438', tier: 'scheduled' }, travel: 1, role: 'through',
    candidates: ['ER', 'EB'], usual: { track: 'ER', tier: 'inferred' },
    evidence: ['gtfs:marta stop_id 908438 on every eastbound Blue Avondale call (service 2026-08-22..2026-12-11)',
      'wikipedia:Avondale_station_(MARTA) "center two tracks are not normally used for through service"', 'osm:way/24850628 usage=main'],
  },
  {
    id: 'blue-westbound', label: 'Blue Line westbound to H. E. Holmes (through)', routeId: 'marta:route:BLUE', inCurrentFeed: true,
    platform: { id: 'marta:stop:908691', tier: 'scheduled' }, travel: -1, role: 'through',
    candidates: ['EL', 'WB'], usual: { track: 'EL', tier: 'inferred' },
    evidence: ['gtfs:marta stop_id 908691 on every westbound Blue Avondale call (service 2026-08-22..2026-12-11)',
      'wikipedia:Avondale_station_(MARTA) "center two tracks are not normally used for through service"', 'osm:way/40894429 usage=main'],
  },
  {
    id: 'green-turnback-arrive', label: 'Green Line limited service, terminating (not in the current feed)', routeId: 'marta:route:GREEN', inCurrentFeed: false,
    platform: { id: 'marta:stop:908438', tier: 'reported' }, travel: 1, role: 'terminates',
    candidates: ['ER', 'EB'], usual: { track: 'EB', tier: 'reported' },
    evidence: ['osm:relation/12300720 stop_exit_only osm:node/8413044626 on EB, platform_exit_only osm:way/78044272',
      'wikipedia:Avondale_station_(MARTA) layout: "Green Line limited service termination track" between the islands',
      'itsmarta.com/Avondale.aspx (2026-11-22) lists only the Blue Line among rail routes'],
  },
  {
    id: 'green-turnback-depart', label: 'Green Line limited service, originating (not in the current feed)', routeId: 'marta:route:GREEN', inCurrentFeed: false,
    platform: { id: 'marta:stop:908691', tier: 'reported' }, travel: -1, role: 'originates',
    candidates: ['EL', 'WB'], usual: { track: 'WB', tier: 'reported' },
    evidence: ['osm:relation/12300721 stop_entry_only osm:node/8413044625 on WB, platform_entry_only osm:way/78044271',
      'wikipedia:Avondale_station_(MARTA) layout: westbound Green limited service on the north island',
      'itsmarta.com/Avondale.aspx (2026-11-22) lists only the Blue Line among rail routes'],
  },
] as const satisfies readonly AvondaleService[];

/** Door side for a train on `track` travelling `travel` (+1 eastbound), from the layout alone. */
export function avondaleDoorSide(platformId: string, track: AvondaleTrack, travel: 1 | -1): Side | null {
  const edge = AVONDALE_LAYOUT.platforms.find((p) => p.id === platformId)?.edges.find((e) => e.trackId === track);
  if (!edge) return null;
  return travel === 1 ? edge.side : edge.side === 'left' ? 'right' : 'left';
}
