import type { RailSpan } from '../core/scene-data';
import type { alignment } from '../vignette/alignment';
import { Line } from '../vignette/geom';
import type { GeorgiaStateScene } from './georgia-state-geometry';
import type { Alignment } from '../vignette/world';

/** Depth in sight through each end of the hall, up to its dark interior backing. */
export const ENTRY_DEPTH = 12;

/** Distances in this model run from the west canopy edge towards the east viaduct.
 * Resolve the observed GTFS boundaries against the actual smoothed line used by the cars. */
export function stationTrack(al: Alignment, pathMetresAt: (s: number) => number, spans?: RailSpan[]) {
  const canopy = spans?.find(sp => sp.ev === 'gsu-canopy' && sp.cover === 'roofed');
  const hall = spans?.find(sp => sp.ev === 'gsu-floyd' && sp.cover === 'covered');
  if (!canopy || !hall) return;
  const forward = canopy.s1 === hall.s0;
  if (!forward && canopy.s0 !== hall.s1) return;
  const west = forward ? canopy.s0 : canopy.s1;
  const join = forward ? hall.s0 : hall.s1;
  const east = forward ? hall.s1 : hall.s0;
  if (Math.min(west, east) < pathMetresAt(0) || Math.max(west, east) > pathMetresAt(al.line.length)) return;
  function distance(target: number) {
    let lo = 0, hi = al.line.length;
    while (hi - lo > 0.005) {
      const mid = (lo + hi) / 2;
      if (pathMetresAt(mid) < target) lo = mid;
      else hi = mid;
    }
    return (hi + lo) / 2;
  }
  const start = distance(west);
  const sign = forward ? 1 : -1;
  const canopyLength = sign * (distance(join) - start);
  const length = sign * (distance(east) - start);
  const point = (d: number) => {
    const s = start + sign * d;
    const { x, z, dx, dz } = al.line.at(s);
    return { x, z, dx: sign * dx, dz: sign * dz, bedY: al.elev(s) };
  };
  const passage = [];
  for (let d = canopyLength; d < length; d += 2) passage.push(point(d));
  passage.push(point(length));
  return { alignment: al, point, passage, canopyLength, length, visibleInStation(s: number) {
    const d = sign * (s - start);
    return (d >= 0 && d < canopyLength + ENTRY_DEPTH) || (d >= length - ENTRY_DEPTH && d < length);
  } };
}

export type StationTrack = NonNullable<ReturnType<typeof stationTrack>>;

/** Bring the display track onto the mapped building passage. Keep GTFS distances
 * (timetable and cover) on the original vertices through both approach transitions. */
export function registerStationLine(legacy: ReturnType<typeof alignment>, site: GeorgiaStateScene,
  spans?: RailSpan[]): ReturnType<typeof alignment> | undefined {
  const observed = stationTrack(legacy, legacy.pathMetresAt, spans);
  if (!observed) return;
  const edges = [[0, site.westTip], [observed.canopyLength, 0], [observed.length, site.faces.se.u]];
  for (const [d, expected] of edges) {
    const p = observed.point(d);
    const { u, v } = site.toFrame(p.x, p.z);
    // Older bakes put the east cut-off roughly 10 m beyond the building.
    if (Math.abs(u - expected) > 5 || Math.abs(v) > 5) return;
  }
  const line = new Line(legacy.line.pts.map(([x, z]) => {
    const { u, v } = site.toFrame(x, z);
    const outside = Math.max(0, site.westTip - u, u - site.faces.se.u);
    if (outside >= 40 || Math.abs(v) > 10) return [x, z];
    const t = outside / 40;
    return site.fromFrame(u, v * t * t * (3 - 2 * t));
  }));
  const originalDistance = (s: number) => {
    const v = line.vertexAt(s);
    const i = Math.min(Math.floor(v), line.pts.length - 2);
    return legacy.line.cum[i] + (v - i) * (legacy.line.cum[i + 1] - legacy.line.cum[i]);
  };
  return { ...legacy, line, elev: s => legacy.elev(originalDistance(s)),
    pathMetresAt: s => legacy.pathMetresAt(originalDistance(s)) };
}
