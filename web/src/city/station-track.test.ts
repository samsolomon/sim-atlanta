import { describe, expect, it } from 'vitest';
import type { RailSpan } from '../core/scene-data';
import { Line } from '../vignette/geom';
import { trackInDaylight, trackVisible, type Alignment } from '../vignette/world';
import { carInDaylight } from './trains';
import { stationTrack } from './station-track';

const run = (s0: number, s1: number, ev: string, cover: RailSpan['cover']): RailSpan =>
  ({ s0, s1, ev, cover, form: 'station', base: 'ground', height: 'schematic', rel: 0 });

describe('Georgia State station drawing', () => {
  for (const eastbound of [true, false]) {
    it('keeps a car beside the canopy until its tail enters the hall, using the ' +
      (eastbound ? 'eastbound' : 'westbound') + ' shape', () => {
      const line = new Line(eastbound ? [[0, 0], [400, 0]] : [[400, 0], [0, 0]]);
      const along = (x: number) => eastbound ? x : 400 - x;
      const track: Alignment = { line, elev: s => -9 - along(s) * .002,
        openToSky: s => along(s) < 60 || along(s) >= 280 };
      const span = (a: number, b: number, id: string, cover: RailSpan['cover']) =>
        run(1000 + Math.min(along(a), along(b)), 1000 + Math.max(along(a), along(b)), id, cover);
      const observed = [span(60, 137, 'gsu-canopy', 'roofed'), span(137, 280, 'gsu-floyd', 'covered')];
      const station = stationTrack(track, s => 1000 + s, observed)!;
      track.visibleInStation = station.visibleInStation;
      expect(station.passage[0].x).toBeCloseTo(137, 2);
      expect(station.passage.at(-1)!.x).toBeCloseTo(280, 2);
      expect(station.point(0).dx).toBe(1);
      expect(trackInDaylight(track, along(90))).toBe(false);
      expect(trackVisible(track, along(90))).toBe(true);
      expect(trackVisible(track, along(143))).toBe(true);
      expect(trackVisible(track, along(257))).toBe(false);
      expect(trackVisible(track, along(273))).toBe(true);
      expect(carInDaylight(track, along(145))).toBe(true);
      expect(carInDaylight(track, along(190))).toBe(false);
      expect(carInDaylight(track, along(275))).toBe(true);
      expect(stationTrack(track, s => 1000 + s, observed.slice(0, 1))).toBeUndefined();
    });
  }
});
