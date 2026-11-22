/**
 * Georgia State station: where the platforms, canopies and the Floyd Building openings are.
 * The sources, precision and checks are in docs/georgia-state-geometry.md, and the tests are in
 * georgia-state-geometry.test.ts.
 *
 * Everything here is surveyed geometry, in lon/lat exactly as published (OSM, checked against
 * NAIP 2023 and Esri imagery on 2026-11-22). Nothing is fitted to City's drawn line, which runs
 * about 2.3 m north of the OSM track centre through the station.
 *
 * The station frame used by `georgiaStateScene` is metres along and across the OSM track axis:
 * - `u` is 0 at the Floyd Building's NW face and grows toward the SE face, so eastbound is +u.
 * - `v` is lateral, positive to the right of eastbound travel (the south/ER side).
 * Callers can re-anchor this frame on whatever running line they draw.
 */
import type { PhysicalPlatform, StationLayout } from '../model/platforms';
import { makeProjector } from '../core/scene-data';

export type LonLat = readonly [lon: number, lat: number];
export type Track = 'ER' | 'EL';

export interface PlatformSource {
  /** OSM railway=platform area, shelter=yes, level 2 (v6, 2022-03-17). */
  osm: string;
  side: 'south' | 'north';
  /** The track it serves: ER eastbound (toward Edgewood/Indian Creek), EL westbound. */
  track: Track;
  /** Closed ring as published (first vertex not repeated). */
  ring: readonly LonLat[];
}

export interface FaceSource {
  /** The building wall's ends, from the Floyd Building outline osm:way/287320828. */
  wall: readonly [LonLat, LonLat];
  /** Where each track's centreline crosses the wall (the tunnel=building_passage end nodes). */
  tracks: Readonly<Record<Track, LonLat>>;
}

export const GEORGIA_STATE = {
  checked: '2026-11-22',
  /** 1σ-ish bounds in metres; see the doc for how each one was judged. */
  precisionM: { faces: 4, westTips: 5, lateral: 1.5 },
  sources: {
    floyd: 'osm:way/287320828',
    towers: ['osm:way/537007595', 'osm:way/537007597'],
    passage: { ER: 'osm:way/702258821', EL: 'osm:way/702258822' },
    stopArea: 'osm:relation/4439511',
    imagery: ['usgs-naip:m_3308413_se_16_060_20231008', 'esri-world-imagery:vantor-2022-09-27-15cm'],
  },
  platforms: [
    {
      osm: 'osm:way/539937961', side: 'south', track: 'ER',
      ring: [[-84.386914, 33.750814], [-84.386949, 33.750779], [-84.386368, 33.750368], [-84.385418, 33.74969], [-84.385385, 33.749722],
        [-84.385615, 33.749887], [-84.386003, 33.750166], [-84.386041, 33.750193], [-84.386333, 33.750402]],
    },
    {
      osm: 'osm:way/539937962', side: 'north', track: 'EL',
      ring: [[-84.386866, 33.750867], [-84.386833, 33.750898], [-84.386257, 33.750476], [-84.385301, 33.749803], [-84.385335, 33.749771],
        [-84.385566, 33.749934], [-84.385958, 33.75021], [-84.385996, 33.750237], [-84.38629, 33.750445]],
    },
  ] as const satisfies readonly PlatformSource[],
  faces: {
    nw: { wall: [[-84.38669, 33.750055], [-84.386254, 33.750479]], tracks: { ER: [-84.386328, 33.750407], EL: [-84.386294, 33.75044] } },
    se: { wall: [[-84.385737, 33.749379], [-84.385301, 33.749803]], tracks: { ER: [-84.385376, 33.749731], EL: [-84.385342, 33.749764] } },
  } as const satisfies Record<'nw' | 'se', FaceSource>,
} as const;

// GTFS has separate eastbound and westbound stop IDs; the surveyed physical
// platform beside each normal running track supplies the modeled association.
export const GEORGIA_STATE_PLATFORMS_BY_STOP = {
  'marta:stop:908696': [GEORGIA_STATE.platforms[0].osm],
  'marta:stop:908618': [GEORGIA_STATE.platforms[1].osm],
} as const;

type XZ = [number, number];

export interface ScenePlatform extends PhysicalPlatform {
  osm: string;
  side: 'south' | 'north';
  track: Track;
  ring: XZ[];
  /** Along-track extent: the west tip, then the east end (at the SE face). */
  u0: number;
  u1: number;
  /** Lateral extent: track-side edge and outer edge, signed like v. */
  inner: number;
  outer: number;
  /** [u0, 0]: open-sided, under its own canopy roof. [0, u1]: under the Floyd Building. */
  canopy: [number, number];
  underBuilding: [number, number];
}

export interface SceneFace {
  u: number;
  wall: [XZ, XZ];
  tracks: Record<Track, XZ>;
  /** The opening's lateral extent: the track and platform strip, outer edge to outer edge. */
  opening: [number, number];
}

export interface GeorgiaStateScene extends StationLayout {
  /** Frame origin (the NW face, on the OSM track axis) and unit vectors, in scene x/z. */
  origin: XZ;
  along: XZ;
  right: XZ;
  toFrame(x: number, z: number): { u: number; v: number };
  fromFrame(u: number, v: number): XZ;
  /** u of the canopies' west end: the farther of the two platform tips. */
  westTip: number;
  platforms: ScenePlatform[];
  faces: { nw: SceneFace; se: SceneFace };
}

/** The station in scene metres for a manifest origin, plus the along/lateral station frame. */
export function georgiaStateScene(origin: { lon: number; lat: number }): GeorgiaStateScene {
  const P = makeProjector(origin);
  const xz = (p: LonLat): XZ => P(p[0], p[1]);
  const mid = (a: XZ, b: XZ): XZ => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const { faces, platforms } = GEORGIA_STATE;
  const o = mid(xz(faces.nw.tracks.ER), xz(faces.nw.tracks.EL));
  const e = mid(xz(faces.se.tracks.ER), xz(faces.se.tracks.EL));
  const len = Math.hypot(e[0] - o[0], e[1] - o[1]);
  const along: XZ = [(e[0] - o[0]) / len, (e[1] - o[1]) / len];
  // Right of travel in x-east / z-south coordinates.
  const right: XZ = [-along[1], along[0]];
  const toFrame = (x: number, z: number) => ({
    u: (x - o[0]) * along[0] + (z - o[1]) * along[1],
    v: (x - o[0]) * right[0] + (z - o[1]) * right[1],
  });
  const fromFrame = (u: number, v: number): XZ => [o[0] + along[0] * u + right[0] * v, o[1] + along[1] * u + right[1] * v];

  const scenePlatforms = platforms.map((p): ScenePlatform => {
    const ring = p.ring.map(xz);
    const f = ring.map(([x, z]) => toFrame(x, z));
    const us = f.map((q) => q.u), vs = f.map((q) => q.v);
    const u0 = Math.min(...us), u1 = Math.max(...us);
    const sign = p.side === 'south' ? 1 : -1;
    const inner = sign * Math.min(...vs.map((v) => sign * v));
    const outer = sign * Math.max(...vs.map((v) => sign * v));
    return { id: p.osm, edges: [{ trackId: p.track, side: sign === 1 ? 'right' : 'left' }],
      osm: p.osm, side: p.side, track: p.track, ring, u0, u1, inner, outer, canopy: [u0, 0], underBuilding: [0, u1] };
  });
  const face = (f: FaceSource): SceneFace => {
    const tracks = { ER: xz(f.tracks.ER), EL: xz(f.tracks.EL) };
    const outers = scenePlatforms.map((p) => p.outer);
    return { u: toFrame(...mid(tracks.ER, tracks.EL)).u, wall: [xz(f.wall[0]), xz(f.wall[1])], tracks, opening: [Math.min(...outers), Math.max(...outers)] };
  };
  return {
    id: GEORGIA_STATE.sources.stopArea, tracks: ['ER', 'EL'], origin: o, along, right, toFrame, fromFrame,
    westTip: Math.min(...scenePlatforms.map((p) => p.u0)),
    platforms: scenePlatforms,
    faces: { nw: face(faces.nw), se: face(faces.se) },
  };
}
