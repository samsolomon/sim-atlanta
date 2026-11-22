import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AVONDALE_LAYOUT, AVONDALE_PHYSICAL, AVONDALE_SERVICE, avondaleDoorSide, type AvondaleTrack } from './avondale-layout';

const DEG = Math.PI / 180, R = 6_371_008.8;
const [lon0, lat0] = AVONDALE_PHYSICAL.station.lonLat;
const b = AVONDALE_PHYSICAL.axisBearingDeg * DEG;
const along = [Math.sin(b), -Math.cos(b)]; // x east, z south
const right = [-along[1], along[0]];
const frame = ([lon, lat]: readonly [number, number]) => {
  const x = (lon - lon0) * DEG * R * Math.cos(lat0 * DEG), z = -(lat - lat0) * DEG * R;
  return { u: x * along[0] + z * along[1], v: x * right[0] + z * right[1] };
};

describe('Avondale physical layout', () => {
  it('lists four tracks north to south, two mains outside two centre tracks', () => {
    const v = AVONDALE_LAYOUT.tracks.map((t) => AVONDALE_PHYSICAL.tracks[t].v);
    expect([...v].sort((a, b) => a - b)).toEqual(v);
    expect(AVONDALE_LAYOUT.tracks.map((t) => AVONDALE_PHYSICAL.tracks[t].role)).toEqual(['main', 'centre', 'centre', 'main']);
  });

  it('puts each island between its two edge tracks, on the declared side (facing eastbound)', () => {
    for (const p of AVONDALE_LAYOUT.platforms) {
      const phys = AVONDALE_PHYSICAL.platforms[p.id];
      const vs = phys.ring.map((q) => frame(q).v);
      const [lo, hi] = [Math.min(...vs), Math.max(...vs)];
      expect(lo).toBeCloseTo(phys.vRange[0], 0);
      expect(hi).toBeCloseTo(phys.vRange[1], 0);
      expect(p.edges).toHaveLength(2);
      for (const e of p.edges) {
        const tv = AVONDALE_PHYSICAL.tracks[e.trackId].v;
        // Right of the track facing eastbound = larger v.
        if (e.side === 'right') expect(lo).toBeGreaterThan(tv);
        else expect(hi).toBeLessThan(tv);
        // A boarding edge is 1.3–2.5 m from its track centre (car half-width ~1.6 m).
        const gap = e.side === 'right' ? lo - tv : tv - hi;
        expect(gap).toBeGreaterThan(1.3);
        expect(gap).toBeLessThan(2.5);
      }
      const us = phys.ring.map((q) => frame(q).u);
      expect(Math.max(...us) - Math.min(...us)).toBeCloseTo(phys.lengthM, -1);
    }
    // Every track has exactly one boarding edge.
    const edges = AVONDALE_LAYOUT.platforms.flatMap((p) => p.edges.map((e) => e.trackId)).sort();
    expect(edges).toEqual([...AVONDALE_LAYOUT.tracks].sort());
  });

  it('opens doors on the left for through trains on the mains, as the station layout states', () => {
    expect(avondaleDoorSide('marta:stop:908438', 'ER', 1)).toBe('left');
    expect(avondaleDoorSide('marta:stop:908691', 'EL', -1)).toBe('left');
    // Centre tracks: a turnback arriving eastbound on EB opens right; leaving west on WB opens right.
    expect(avondaleDoorSide('marta:stop:908438', 'EB', 1)).toBe('right');
    expect(avondaleDoorSide('marta:stop:908691', 'WB', -1)).toBe('right');
    expect(avondaleDoorSide('marta:stop:908438', 'EL', 1)).toBeNull();
  });
});

describe('Avondale service evidence', () => {
  it('offers every track facing the platform, and keeps the usual track an inference or a report', () => {
    for (const s of AVONDALE_SERVICE) {
      const facing = AVONDALE_LAYOUT.platforms.find((p) => p.id === s.platform.id)!.edges.map((e) => e.trackId);
      expect([...s.candidates].sort(), s.id).toEqual([...facing].sort());
      if (s.usual) {
        expect(s.candidates as readonly AvondaleTrack[]).toContain(s.usual.track);
        expect(['inferred', 'reported']).toContain(s.usual.tier); // never scheduled or live
      }
      expect(s.evidence.length).toBeGreaterThan(1);
      if (!s.inCurrentFeed) expect(s.platform.tier).not.toBe('scheduled');
    }
  });
});

const data = resolve(__dirname, '../../public/data/ga');
const staged = ['timetable.json', 'routes.json'].every((f) => existsSync(resolve(data, f)));

describe.skipIf(!staged)('Avondale against the staged MARTA timetable', () => {
  type Pattern = { routeId: string; headsign: string; stops: string[] };
  const tt = staged ? (JSON.parse(readFileSync(resolve(data, 'timetable.json'), 'utf8')).timetables as { feed: string; patterns: Pattern[]; trips: [number, number, ...unknown[]][] }[]).find((t) => t.feed === 'marta')! : null!;
  const platforms = new Set<string>(AVONDALE_LAYOUT.platforms.map((p) => p.id));

  it('calls only Blue through trains, eastbound at 908438 and westbound at 908691', () => {
    const seen = new Map<string, number>();
    for (const [pi] of tt.trips) {
      const p = tt.patterns[pi];
      p.stops.forEach((stop, i) => {
        if (!platforms.has(stop)) return;
        expect(i > 0 && i < p.stops.length - 1, `${p.headsign} terminates or originates at Avondale`).toBe(true);
        const dir = /EASTBOUND/.test(p.headsign) ? 1 : /WESTBOUND/.test(p.headsign) ? -1 : 0;
        const key = `${p.routeId}|${stop}|${dir}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      });
    }
    const current = AVONDALE_SERVICE.filter((s) => s.inCurrentFeed);
    expect([...seen.keys()].sort()).toEqual(current.map((s) => `${s.routeId}|${s.platform.id}|${s.travel}`).sort());
  });
});
