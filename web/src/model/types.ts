/**
 * Canonical data model. The Rust pipeline (pipeline/src/emit.rs) emits JSON that
 * must match these types; web/src/model/contract.test.ts checks generated files.
 * See docs/data-model.md for the reasoning.
 */

/** How much to trust a value. Every displayed fact carries one of these. */
export type Tier =
  | 'live' //        a real-time feed reported it moments ago
  | 'scheduled' //   derived from a published timetable
  | 'reported' //    an average the operator reported (e.g. FRA Form 71)
  | 'inferred' //    filled in by us from nearby reported values
  | 'illustrative'; // a typical example, not a real observation

/** Namespaced source id, e.g. "marta-gtfs", "fra-crossings". Defined in meta.json. */
export type SourceId = string;

export interface Sourced<T> {
  value: T;
  tier: Tier;
  source: SourceId;
  /** ISO date or datetime the value reflects. */
  asOf: string;
}

/** IDs are "<feed>:<kind>:<stable name>", e.g. "marta:route:RED", "fra:crossing:718065F". */
export type Id = string;

export type Mode = 'heavy_rail' | 'light_rail' | 'streetcar' | 'intercity' | 'freight' | 'bus';

export interface Source {
  id: SourceId;
  name: string;
  url: string;
  license: string;
  retrieved: string;
}

export interface Meta {
  region: string;
  generated: string;
  bbox: [number, number, number, number];
  timezone: string;
  sources: Source[];
}

export interface Route {
  id: Id;
  operator: string;
  shortName: string;
  longName: string;
  mode: Mode;
  color: string; // "#RRGGBB"
  vehicleType: Id;
  source: SourceId;
}

export interface Stop {
  id: Id;
  name: string;
  lon: number;
  lat: number;
}

/** A polyline with cumulative distances, so positions can be "metres along path". */
export interface Path {
  id: Id;
  routeId: Id;
  /** Flat [lon0, lat0, lon1, lat1, ...] rounded to 1e-5. */
  coords: number[];
  /** Cumulative metres at each vertex; cum[0] = 0. */
  cum: number[];
}

/**
 * A stopping pattern: the sequence of stops a group of trips shares, with their
 * position along the path and time offsets from the trip's start.
 */
export interface Pattern {
  id: string;
  routeId: Id;
  pathId: Id;
  headsign: string;
  stops: Id[];
  /** Metres along path for each stop. */
  dist: number[];
  /** Seconds after trip start the train arrives at each stop. */
  arr: number[];
  /** Seconds after trip start the train departs each stop. */
  dep: number[];
}

/** Service calendar: which dates a service id runs. Dates are YYYYMMDD numbers. */
export interface Service {
  id: string;
  /** Mon..Sun as 7 booleans packed in a bitmask, bit 0 = Monday. */
  days: number;
  start: number;
  end: number;
  added: number[];
  removed: number[];
}

export interface Timetable {
  feed: string;
  timezone: string;
  patterns: Pattern[];
  services: Service[];
  /** Compact trips: [patternIndex, serviceIndex, startSeconds, tripShortName]. Start may exceed 86400. */
  trips: [number, number, number, string][];
}

export interface TimetableFile {
  sourceAsOf: Record<string, string>;
  timetables: Timetable[];
}

export interface RoutesFile {
  routes: Route[];
  stops: Stop[];
  paths: Path[];
}

/** Freight track arc properties (GeoJSON feature properties in freight.geojson). */
export interface TrackArcProps {
  id: Id; // "narn:arc:<FRAARCID>"
  owner: string; // e.g. "NS", "CSXT"
  rights: string[]; // other railroads with trackage rights
  subdiv: string | null;
  tracks: number | null;
  passenger: boolean;
  /** NARN network class: M main, S siding, I/O industrial, Y yard, F ferry. */
  net: string;
  /** Trains per day; tier is "reported" (from attached crossings) or "inferred". */
  tpd: number | null;
  tpdTier: Tier | null;
}

/** Crossing properties (GeoJSON feature properties in crossings.geojson). */
export interface CrossingProps {
  id: Id; // "fra:crossing:<crossingid>"
  railroad: string;
  street: string;
  city: string;
  position: string; // "At Grade" | "RR Under" | "RR Over"
  dayTrains: number;
  nightTrains: number;
  passengerTrains: number;
  maxSpeedMph: number | null;
  arcId: Id | null;
}

export interface VehicleType {
  id: Id;
  name: string;
  lengthM: number;
  /** Typical number of these coupled together (cars per MARTA train, etc.). Illustrative. */
  typicalUnits: number;
  /** Key into the art catalog (sprites/models come later). */
  art: string;
  canCarry?: string;
}

/**
 * Normalized train state. Every source (GTFS-RT positions, MARTA arrival predictions,
 * timetables) is converted into this shape before rendering.
 */
export interface TrainState {
  id: Id;
  routeId: Id;
  pathId: Id;
  /** Metres along the path. */
  s: Sourced<number>;
  /** Degrees clockwise from north. */
  heading: number;
  lon: number;
  lat: number;
  speedMps?: number;
  lengthM: Sourced<number>;
  vehicleType: Id;
  headsign: string;
  /** Current timetable call, during a dwell or exactly at a zero-duration call. */
  scheduledStop?: Id;
  nextStop?: Id;
  /** Display name of the next stop when it comes from a live feed rather than a stop id. */
  nextStopName?: string;
  /** Seconds until the next stop, when a live feed predicts it. */
  nextInSec?: number;
  /** When the source observed this position (ms since epoch); live only. */
  observedAt?: number;
  label?: string;
}

/** MARTA VehiclePositions. Sourced fields share the vehicle observation time.
 * An empty asOf and null at mean the vehicle omitted its timestamp. */
export interface LiveBus {
  id: Id;
  at: number | null;
  position: Sourced<{ lon: number; lat: number }>;
  routeId?: Sourced<Id>;
  bearing?: Sourced<number>; // degrees clockwise from north
  speed?: Sourced<number>; // metres/second
}

/** Compact wire representation; fields inherit the vehicle's observation time. */
export interface BusFix {
  id: Id;
  at: number | null;
  lon: number;
  lat: number;
  routeId?: Id;
  bearing?: number;
  speed?: number;
}

export interface BusFeed {
  source: 'marta-bus-rt';
  fetched: number;
  buses: BusFix[];
}

export type BusRoutes = Record<Id, string>; // raw GTFS route_id → stable public short name

/** Separate Route 49 GTFS edition. Rail schedules never ingest these trips. */
export interface BusTimetableFile extends RoutesFile {
  source: { url: string; retrieved: string; sha256: string };
  timetable: Timetable;
}
