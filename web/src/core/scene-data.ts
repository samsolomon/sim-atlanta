/** The baked downtown rail profiles (pipeline/src/scene.rs) and its coordinate system. */

export interface Profile {
  s0: number;
  step: number;
  z: number[];
}

export interface SceneManifest {
  name: string;
  origin: { lon: number; lat: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  profiles: Record<string, Profile>;
  /** Observed cover and terrain-relative rail height (optional: older bakes lack it). */
  rail?: RailData;
  notes: string;
  sources: { name: string; attribution?: string }[];
}

/**
 * What is over the track (the sky only; independent of height). `roofed` is a station canopy
 * or roof directly over the tracks: not a tunnel mouth, so no portal at its edge.
 */
export type RailCover = 'open' | 'covered' | 'roofed';
export type RailForm = 'tunnel' | 'cut' | 'grade' | 'station' | 'viaduct';

/** A point where the renderer samples measured ground to hang a schematic height from. */
export interface RailAnchor {
  /** Metres along this path. */
  s: number;
  /** Scene metres (x east, z south) of the identified location. */
  x: number;
  z: number;
  /** What it is, e.g. "east face of Georgia State station (Floyd Building)". */
  at: string;
  /** Bed height above the ground here (m, schematic); overrides the span's `rel`. */
  rel?: number;
}

/**
 * One observed stretch of one path: half-open [s0, s1) in metres along that GTFS path (the
 * same `s` as Profile and TrainSource), projected separately for each path and direction.
 * Height is the **track bed** (the level the legacy profile `z` describes): rails and cars
 * sit +0.55 m above it, so apply that offset once.
 *
 * Height bases:
 * - `ground`: bed = ground(x(s), z(s)) + rel. Use for cuts, grade and station floors, where
 *   the bare-earth grid already samples the floor (an open cut's rel is 0, not −4).
 * - `anchors`: bed = piecewise-linear between ground(anchor) + (anchor.rel ?? rel) at each
 *   anchor, held flat beyond the first and last; `grade` (m per m, default 0) extends a single
 *   anchor. Use for viaducts so the track never follows the DEM down into a road under it.
 *   Neighbouring spans that share an anchor chain are continuous across their seam.
 */
export interface RailSpan {
  s0: number;
  s1: number;
  cover: RailCover;
  form: RailForm;
  base: 'ground' | 'anchors';
  rel: number;
  anchors?: RailAnchor[];
  grade?: number;
  /** Every height here is schematic until a measured source exists. */
  height: 'schematic' | 'measured';
  /** Key into RailData.evidence. */
  ev: string;
}

export interface RailEvidence {
  name: string;
  /** Date the sources were checked (ISO). */
  checked: string;
  sources: string[];
  /** ± metres on the span edges along the path. */
  precisionM: number;
  note?: string;
}

export interface RailData {
  version: 1;
  /** Heights describe the track bed; rails/cars add their own offset. */
  datum: 'track-bed';
  /** Spans per path id, sorted by s0 and non-overlapping. Gaps and s outside spans: unknown. */
  paths: Record<string, RailSpan[]>;
  evidence: Record<string, RailEvidence>;
}

/**
 * The observed span at `s` on a path, or null when nothing is known there (gaps, unlisted
 * paths, older bakes without `rail`): fall back to the legacy profile against PORTAL_E.
 */
export function railSpanAt(rail: RailData | undefined, pathId: string, s: number): RailSpan | null {
  const spans = rail?.paths[pathId];
  if (!spans?.length) return null;
  let lo = 0;
  let hi = spans.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const sp = spans[mid];
    if (s < sp.s0) hi = mid - 1;
    else if (s >= sp.s1) lo = mid + 1;
    else return sp;
  }
  return null;
}

/**
 * Track-bed height for a span at `s`, given a ground sampler in scene metres (bare earth,
 * same vertical zero as the board) and the ground directly under the track at s.
 */
export function railBedY(span: RailSpan, s: number, groundHere: number, ground: (x: number, z: number) => number): number {
  if (span.base === 'ground' || !span.anchors?.length) return groundHere + span.rel;
  const a = span.anchors;
  const y = (k: RailAnchor) => ground(k.x, k.z) + (k.rel ?? span.rel);
  if (a.length === 1 || s <= a[0].s) return y(a[0]) + (a.length === 1 ? (span.grade ?? 0) * (s - a[0].s) : 0);
  for (let i = 1; i < a.length; i++) {
    if (s <= a[i].s) {
      const t = (s - a[i - 1].s) / (a[i].s - a[i - 1].s || 1);
      return y(a[i - 1]) + (y(a[i]) - y(a[i - 1])) * t;
    }
  }
  return y(a[a.length - 1]);
}

const R = 6_371_008.8;
const DEG = Math.PI / 180;

/** lon/lat → scene metres (x east, z −north). Must match `scene::project` in Rust. */
export function makeProjector(origin: { lon: number; lat: number }) {
  const k = Math.cos(origin.lat * DEG);
  return (lon: number, lat: number): [number, number] => [(lon - origin.lon) * DEG * R * k, -(lat - origin.lat) * DEG * R];
}

/**
 * Elevation (m) of a path at `s` metres. Beyond the baked range it holds the end value, so a
 * train still in a tunnel at the scene edge doesn't pop up to street level. 0 if unprofiled.
 */
export function elevationAt(p: Profile | undefined, s: number): number {
  if (!p || !p.z.length) return 0;
  const f = Math.min(Math.max((s - p.s0) / p.step, 0), p.z.length - 1);
  const i = Math.floor(f);
  const t = f - i;
  return p.z[i] + (p.z[Math.min(i + 1, p.z.length - 1)] - p.z[i]) * t;
}

