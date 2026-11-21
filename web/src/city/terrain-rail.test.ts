/** terrainAlignment / terrainOpenings on the real downtown bake and the checked-in USGS grid. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { RoutesFile } from '../model/types';
import { railSpanAt, type SceneManifest } from '../core/scene-data';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { alignment } from '../vignette/alignment';
import { Line } from '../vignette/geom';
import { portalEnds, trackInDaylight, PORTAL_E, type Alignment } from '../vignette/world';
import { terrainAlignment, terrainOpenings } from './terrain-rail';

const data = resolve(__dirname, '../../public/data');
const proto = resolve(__dirname, '../../../pipeline/prototypes/downtown-ground');
const has = existsSync(resolve(data, 'scene/downtown/scene.json')) && existsSync(resolve(proto, 'ground.i16'));
const BOARD = { minX: -1000, maxX: 1000, minZ: -1300, maxZ: 700 };
const EAST = 'marta:path:155177'; // Blue eastbound (the 14:11 Five Points trip)
const WEST = 'marta:path:155188'; // Blue westbound
const GREEN_EAST = 'marta:path:155214';

describe.skipIf(!has)('terrain rail adapter', () => {
  const manifest: SceneManifest = has ? JSON.parse(readFileSync(resolve(data, 'scene/downtown/scene.json'), 'utf8')) : null!;
  const routes: RoutesFile = has ? JSON.parse(readFileSync(resolve(data, 'ga/routes.json'), 'utf8')) : null!;
  const gm: GroundManifest = has ? JSON.parse(readFileSync(resolve(proto, 'ground.json'), 'utf8')) : null!;
  const bin = has ? readFileSync(resolve(proto, 'ground.i16')) : null!;
  const grid = has ? new GroundGrid(gm, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength)) : null!;
  const ground = (x: number, z: number) => grid.sample(x, z)! - gm.vertical.sceneZeroNavd88M;
  const build = (id: string) => {
    const legacy = alignment(routes, manifest, BOARD, id);
    return { legacy, al: terrainAlignment(legacy, id, manifest, grid) };
  };
  /** Rendered distance whose GTFS path metres is `pm` (the line runs one way along the path). */
  const sAt = (legacy: ReturnType<typeof alignment>, pm: number) => {
    let lo = 0, hi = legacy.line.length;
    const up = legacy.pathMetresAt(hi) > legacy.pathMetresAt(lo);
    for (let k = 0; k < 60; k++) {
      const mid = (lo + hi) / 2;
      if ((legacy.pathMetresAt(mid) < pm) === up) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const spans = (id: string) => manifest.rail!.paths[id];
  const span = (id: string, ev: string) => spans(id).find((sp) => sp.ev === ev)!;

  it('exposes exactly the observed spans, both directions', () => {
    for (const id of [EAST, WEST, GREEN_EAST]) {
      const { legacy, al } = build(id);
      for (const sp of spans(id)) {
        for (const pm of [sp.s0 + 1, (sp.s0 + sp.s1) / 2, sp.s1 - 1]) {
          const s = sAt(legacy, pm);
          if (s <= 0 || s >= al.line.length) continue; // beyond the board
          expect(al.coverAt!(s), `${id} ${sp.ev} @${pm}`).toBe(sp.cover);
          expect(trackInDaylight(al, s), `${id} ${sp.ev} @${pm}`).toBe(sp.cover === 'open');
        }
      }
    }
  });

  it('decides unknown stretches by the legacy profile alone, not the blended terrain bed', () => {
    const { legacy, al } = build(EAST);
    // Just west of the Washington St portal: unobserved tunnel, inside the 60 m blend.
    const s = sAt(legacy, span(EAST, 'gsu-west-open').s0 - 20);
    expect(al.coverAt!(s)).toBeUndefined();
    expect(legacy.elev(s)).toBeLessThan(PORTAL_E);
    expect(trackInDaylight(al, s)).toBe(false);
    // Every unknown sample on every path follows the legacy test.
    for (const id of [EAST, WEST, GREEN_EAST]) {
      const b = build(id);
      for (let t = 0; t <= b.al.line.length; t += 3) {
        if (b.al.coverAt!(t) !== undefined) continue;
        expect(trackInDaylight(b.al, t), `${id} @${t}`).toBe(b.legacy.elev(t) >= PORTAL_E);
      }
    }
  });

  it('beds open cuts on the DEM floor and keeps viaducts off the freeway', () => {
    const { legacy, al } = build(EAST);
    for (const ev of ['gulch-trench', 'five-points-east-cut']) {
      const sp = span(EAST, ev);
      const s = sAt(legacy, (sp.s0 + sp.s1) / 2);
      const p = al.line.at(s);
      expect(Math.abs(al.elev(s) - ground(p.x, p.z)), ev).toBeLessThan(0.5);
      expect(al.referenceY!(s) - al.elev(s), `${ev} is below its banks`).toBeGreaterThan(1);
    }
    // Over the Connector (x 680…800) the bed is well above the road, and smooth.
    let prev: number | null = null;
    for (let s = 0; s <= al.line.length; s += 2) {
      const p = al.line.at(s);
      if (p.x < 680 || p.x > 800) continue;
      expect(al.formAt!(s)).toBe('viaduct');
      // Over the carriageways (x 700…780) the deck clears the DEM low by over 10 m; nearer the banks, 6.
      expect(al.elev(s) - ground(p.x, p.z), `deck clearance at x ${p.x.toFixed(0)}`).toBeGreaterThan(p.x > 700 && p.x < 780 ? 10 : 6);
      if (prev != null) expect(Math.abs(al.elev(s) - prev)).toBeLessThan(0.2);
      prev = al.elev(s);
    }
  });

  it('has no height steps a car could straddle, incl. every visible run end, both directions', () => {
    for (const id of [EAST, WEST, GREEN_EAST]) {
      const { al } = build(id);
      let worst = 0;
      for (let s = 1; s <= al.line.length; s += 1) worst = Math.max(worst, Math.abs(al.elev(s) - al.elev(s - 1)));
      expect(worst, id).toBeLessThan(1.0); // per metre
      // Across each exposure boundary, a 20 m car's ends differ by less than a gentle ramp.
      for (let s = 1; s < al.line.length; s += 1) {
        if (trackInDaylight(al, s) === trackInDaylight(al, s - 1)) continue;
        expect(Math.abs(al.elev(Math.min(s + 10, al.line.length)) - al.elev(Math.max(s - 10, 0))), `${id} edge @${s}`).toBeLessThan(6);
      }
    }
  });

  it('puts tunnel mouths at the Gulch, the east cut and Washington St, never at the canopy or building', () => {
    const { legacy, al } = build(EAST);
    const runs: [number, number][] = [];
    let open: number | null = null;
    for (let s = 0; s <= al.line.length; s += 1) {
      const ok = trackInDaylight(al, s);
      if (ok && open == null) open = s;
      if (!ok && open != null) runs.push([open, s]), (open = null);
    }
    if (open != null) runs.push([open, al.line.length]);
    const pm = (s: number) => legacy.pathMetresAt(s);
    const runOf = (ev: string) => runs.find(([a, b]) => pm(a) <= span(EAST, ev).s0 + 3 && pm(b) >= span(EAST, ev).s1 - 3)!;
    expect(portalEnds(al, ...runOf('gulch-trench'))).toEqual([true, true]);
    expect(portalEnds(al, ...runOf('five-points-east-cut'))).toEqual([true, true]);
    // Washington St mouth, then the canopy: track continues under a roof, no portal.
    expect(portalEnds(al, ...runOf('gsu-west-open'))).toEqual([true, false]);
    // The viaduct starts at the Floyd Building's east face: a building, not a tunnel.
    const via = runs.find(([a]) => Math.abs(pm(a) - span(EAST, 'connector-viaduct').s0) < 3)!;
    expect(portalEnds(al, ...via)[0]).toBe(false);
  });

  it('cuts terrain slots only over open cuts, at bed height', () => {
    const als = [EAST, WEST].map((id) => ({ id, ...build(id) }));
    const slots = terrainOpenings(als.map((a) => a.al));
    expect(slots.length).toBeGreaterThan(5);
    for (const sl of slots) {
      // Find the alignment and distance this slot starts at.
      const hit = als.map((a) => {
        let best = { d: Infinity, s: 0 };
        for (let s = 0; s <= a.al.line.length; s += 1) {
          const p = a.al.line.at(s);
          const d = Math.hypot(p.x - sl.start[0], p.z - sl.start[2]);
          if (d < best.d) best = { d, s };
        }
        return { ...a, ...best };
      }).sort((x, y) => x.d - y.d)[0];
      expect(hit.d).toBeLessThan(0.01);
      expect(trackInDaylight(hit.al, hit.s)).toBe(true);
      expect(['cut', 'grade', undefined]).toContain(hit.al.formAt!(hit.s)); // never under a roof, building or deck
      expect(Math.abs(sl.start[1] - hit.al.elev(hit.s))).toBeLessThan(1e-6);
    }
  });
});

describe('terrain rail adapter without ground or observations', () => {
  it('falls back to the legacy profile on the board zero when the grid has no data', () => {
    const gm: GroundManifest = { version: 1, rows: 2, cols: 2, stepM: 10, bounds: { minX: 0, maxX: 10, minZ: 0, maxZ: 10 }, scaleM: 0.1, offsetM: 0, noData: -32768, encoding: 'signed int16 little-endian', vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 }, sha256: '' };
    const grid = new GroundGrid(gm, new Int16Array(4).fill(-32768).buffer);
    const legacy = { line: new Line([[-50, 0], [50, 0]]), elev: (s: number) => (s < 50 ? -10 : 7), pathMetresAt: (s: number) => s } as ReturnType<typeof alignment>;
    const manifest = { origin: { lon: 0, lat: 0 }, bounds: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 }, profiles: {}, notes: '', sources: [], name: '' } as SceneManifest;
    const al: Alignment = terrainAlignment(legacy, 'p', manifest, grid);
    expect(railSpanAt(manifest.rail, 'p', 10)).toBeNull();
    expect(al.elev(10)).toBeCloseTo(-10);
    expect(trackInDaylight(al, 10)).toBe(false);
    expect(trackInDaylight(al, 90)).toBe(true);
    expect(al.coverAt!(10)).toBeUndefined();
  });
});
