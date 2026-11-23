import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SceneManifest } from '../core/scene-data';
import type { RoutesFile } from '../model/types';
import { GroundGrid } from '../terrain/grid';
import { alignment } from '../vignette/alignment';
import { CAR_WIDTH } from '../vignette/cq400';
import { MARTA_TRACK_OFFSET } from '../vignette/world';
import { buildEastRail, extendRail, joinedGround, type CorridorPack } from './east-rail';
import { terrainAlignment } from './terrain-rail';

const data = resolve(__dirname, '../../public/data');
const files = ['scene/downtown/scene.json', 'scene/downtown/ground.json', 'scene/downtown/ground.i16', 'ga/routes.json',
  'scene/king-memorial/ground.json', 'scene/king-memorial/ground.i16', 'scene/king-memorial/corridor.json'];
const staged = files.every(f => existsSync(resolve(data, f)));
const J = <T>(f: string): T => JSON.parse(readFileSync(resolve(data, f), 'utf8'));
const grid = (dir: string) => {
  const bin = readFileSync(resolve(data, `scene/${dir}/ground.i16`));
  return new GroundGrid(J(`scene/${dir}/ground.json`), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
};

describe.skipIf(!staged)('MARTA east of the board', () => {
  const manifest = staged ? J<SceneManifest>('scene/downtown/scene.json') : null!;
  const rf = staged ? J<RoutesFile>('ga/routes.json') : null!;
  const down = staged ? grid('downtown') : null!;
  const eastGrid = staged ? grid('king-memorial') : null!;
  const zero = staged ? down.manifest.vertical.sceneZeroNavd88M : 0;
  const eastGround = (x: number, z: number) => { const h = eastGrid.sample(x, z); return h == null ? null : h - zero; };
  const extended = staged ? extendRail(manifest, rf) : null!;

  it('adds an estimated station span under the canopy between measured viaduct spans, both directions', () => {
    for (const [id, order] of [['155177', 1], ['155188', -1]] as const) {
      const spans = extended.rail!.paths[`marta:path:${id}`];
      const seq = spans.filter(sp => sp.ev === 'connector-viaduct' || sp.ev === 'king-memorial-canopy').map(sp => [sp.ev, sp.cover, sp.height]);
      const expected = [['connector-viaduct', 'open', 'measured'], ['king-memorial-canopy', 'roofed', 'schematic'], ['connector-viaduct', 'open', 'measured']];
      expect(seq, id).toEqual(order === 1 ? expected : [...expected].reverse());
      const station = spans.find(sp => sp.ev === 'king-memorial-canopy')!;
      expect(station.s1 - station.s0, id).toBeGreaterThan(180); // the measured roof stretch is ~190 m
      expect(station.s1 - station.s0, id).toBeLessThan(200);
      const chain = spans.filter(sp => sp.ev.startsWith('gsu') || sp.ev === 'connector-viaduct' || sp.ev === 'king-memorial-canopy');
      for (let i = 1; i < chain.length; i++) expect(chain[i].s0, id).toBeCloseTo(chain[i - 1].s1, 1);
    }
    // Downtown's own bake is left alone.
    expect(manifest.rail!.paths['marta:path:155177'].some(sp => sp.ev === 'king-memorial-canopy')).toBe(false);
  });

  it('leaves the downtown alignment unchanged west of the seam (within 1 cm)', () => {
    const b = { minX: -1000, maxX: 1000, minZ: -1300, maxZ: 700 };
    const id = 'marta:path:155177';
    const before = terrainAlignment(alignment(rf, manifest, b, id), id, manifest, down);
    const after = terrainAlignment(alignment(rf, extended, { ...b, maxX: 1800 }, id), id, extended, joinedGround(down, eastGround));
    let checked = 0, maxD = 0, maxY = 0;
    for (let s = 0; s < before.line.length; s += 10) {
      const p = before.line.at(s);
      if (p.x > 900 || p.x < -900) continue; // the old line's own smoothing ends at its pad
      let best = { d: Infinity, t: 0 };
      for (let t = 0; t < after.line.length; t += 0.5) {
        const q = after.line.at(t);
        const d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d < best.d) best = { d, t };
      }
      maxD = Math.max(maxD, best.d);
      const dy = Math.abs(after.elev(best.t) - before.elev(s));
      // Observed rail spans: unchanged to the centimetre. Unobserved stretches use the legacy
      // schematic profile, whose elevation `alignment()` indexes by one ratio over the whole
      // smoothed line; a longer line shifts it by a few centimetres.
      if (before.coverAt?.(s) !== undefined) expect(dy, `observed span at x ${p.x.toFixed(0)}`).toBeLessThan(0.01);
      else expect(dy, `legacy stretch at x ${p.x.toFixed(0)}`).toBeLessThan(0.05);
      maxY = Math.max(maxY, dy);
      checked++;
    }
    expect(maxD).toBeLessThan(0.01);
    expect(checked).toBeGreaterThan(100);
  });

  it('builds a station whose platforms clear City\'s cars and whose roof is the measured roof', () => {
    const pack = J<CorridorPack>('scene/king-memorial/corridor.json');
    const rail = buildEastRail(extended, rf, pack, eastGround, zero);
    // Both side platforms are drawn, each lip just outside the drawn car side (within the 76 mm
    // level-boarding limit), and each extends away from the tracks.
    const carSide = MARTA_TRACK_OFFSET + CAR_WIDTH / 2;
    expect(rail.platforms).toHaveLength(2);
    expect(rail.platforms.map(p => Math.sign(p.lip)).sort()).toEqual([-1, 1]);
    for (const p of rail.platforms) {
      expect(Math.abs(p.lip) - carSide).toBeGreaterThan(0);
      expect(Math.abs(p.lip) - carSide).toBeLessThanOrEqual(0.076);
      expect(Math.abs(p.outer)).toBeGreaterThan(Math.abs(p.lip) + 3);
    }
    expect(rail.mesh.geometry.attributes.position.count).toBeGreaterThan(1000);
    // The OSM station building is drawn on its footprint, from the ground to under the platforms.
    expect(rail.building).toBeDefined();
    expect(rail.building!.ring).toHaveLength(26);
    expect(rail.building!.top).toBeLessThan(rail.floor(9040) - 0.8);
    expect(rail.building!.top - rail.building!.base).toBeGreaterThan(8);
    // The drawn roof is the measured roof wherever the lidar saw it.
    for (const r of rail.roofDrawn) {
      const m = pack.guideway.reduce((a, b) => (Math.abs(b.s - r.s) < Math.abs(a.s - r.s) ? b : a));
      if (m.roof !== null) expect(r.y).toBeCloseTo(m.roof - zero, 5);
    }
    // Measured anchors either side of the canopy: the bed there is the lidar top − 0.55 m.
    const via = extended.rail!.paths['marta:path:155177'].find(sp => sp.ev === 'connector-viaduct')!;
    const anchor = (s: number) => via.anchors!.find(a => Math.abs(a.s - s) < 3)!;
    for (const s of [8932.5, 9137.5]) expect(rail.bed(anchor(s).s)).toBeCloseTo(anchor(s).navd88! - zero, 3);
    // Under the roof the bed is an interpolation (estimate), monotone between those anchors.
    expect(rail.bed(9040)).toBeLessThan(rail.bed(8932.5));
    expect(rail.bed(9040)).toBeGreaterThan(rail.bed(9137.5));
    expect(rail.sSeam).toBeCloseTo(8541.6, -1);
    // Exterior: the zigzag stair rises from the ground to the platform floor at the west end, in
    // several flights; the entry canopy stands on Decatur St's station side at street-canopy height.
    const st = rail.exterior.stair!, cn = rail.exterior.canopy!;
    expect(st.flights).toBeGreaterThanOrEqual(3);
    expect(st.rise).toBeGreaterThan(12);
    expect(st.x).toBeLessThan(1430); // the Grant St end
    expect(cn.underside).toBeGreaterThan(3.5);
    expect(cn.underside).toBeLessThan(6);
    expect(cn.length).toBeGreaterThan(40);
    // Platform lights: dark by day, on at night (lamp discs plus floor pools).
    const lights = rail.mesh.getObjectByName('King Memorial platform lights')!;
    expect(rail.lampCount).toBeGreaterThan(0);
    rail.setNight(0);
    expect(lights.visible).toBe(false);
    rail.setNight(1);
    expect(lights.visible).toBe(true);
    rail.dispose();
  });
});
