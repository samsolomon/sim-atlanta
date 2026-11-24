import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeProjector, type SceneManifest } from '../core/scene-data';
import type { RoutesFile } from '../model/types';
import { GroundGrid } from '../terrain/grid';
import { alignment } from '../vignette/alignment';
import { CAR_WIDTH } from '../vignette/cq400';
import { MARTA_TRACK_OFFSET } from '../vignette/world';
import { buildEastRail, ENCLOSURES, extendRail, joinedGround, STATION_BUILDING, type CorridorPack } from './east-rail';
import kingRail from './fixtures/king-rail.json';
import { grantFormation } from './grant-street';
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
    // Only the lobby and the lifted mezzanine are enclosed; the mezzanine meets the platform fascia
    // and clears the street level, and the lobby stays under the entry canopy.
    const { lobby, mezzanine } = rail.enclosed;
    expect(mezzanine!.top).toBeCloseTo(Math.min(rail.floor(9010), rail.floor(9094)) - 0.8, 5);
    expect(mezzanine!.underside - eastGround(1480, 415)!).toBeGreaterThan(6);
    // The lobby stays a street-level box: a clear gap under the mezzanine, not a wall up to the deck.
    expect(mezzanine!.underside - lobby!.top).toBeGreaterThan(1.5);
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
    const east = rail.exterior.eastStair!;
    expect(east.x).toBeGreaterThan(1520); // the Borders Dr end
    expect(east.flights).toBeGreaterThanOrEqual(3); // the ground rises toward the east end
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

  it('keeps King Memorial guideway supports clear of the CSX mains and yard leads', () => {
    const rail = buildEastRail(extended, rf, J<CorridorPack>('scene/king-memorial/corridor.json'), eastGround, zero);
    const ray = new THREE.Raycaster();
    const hits: string[] = [];
    let tested = 0;
    try {
      for (const run of kingRail.filter(r => r.cls === 'standard_gauge')) {
        for (let i = 1; i < run.pts.length; i++) {
          const [ax, az] = run.pts[i-1], [bx, bz] = run.pts[i];
          const len = Math.hypot(bx-ax, bz-az);
          if (!len) continue;
          const ux = (bx-ax)/len, uz = (bz-az)/len;
          // Sweep the modeled 3.2 m locomotive width at mid-body height.
          // The 0.8 m spacing is narrower than the 1.6 m guideway columns.
          for (let d = 0; d < len; d += 8) {
            const end = Math.min(d+8,len);
            const h0 = eastGround(ax+d*ux,az+d*uz), h1 = eastGround(ax+end*ux,az+end*uz);
            if (h0 === null || h1 === null) continue;
            const y0 = grantFormation(ax + d * ux, h0, zero);
            const y1 = grantFormation(ax + end * ux, h1, zero);
            const direction = new THREE.Vector3((end-d)*ux,y1-y0,(end-d)*uz);
            ray.far = direction.length();
            direction.normalize();
            for (const offset of [-1.6,-.8,0,.8,1.6]) {
              ray.set(new THREE.Vector3(ax+d*ux-offset*uz,y0+2,az+d*uz+offset*ux),direction);
              const hit = ray.intersectObject(rail.mesh,false)[0];
              if (hit) hits.push(run.id + ' at ' + hit.point.toArray().map(n=>n.toFixed(1)).join(','));
            }
            tested += end-d;
          }
        }
      }
      expect(tested).toBeGreaterThan(2000);
      expect(hits).toEqual([]);
    } finally { rail.dispose(); }
  });

  it('leaves the street level under the platforms open between the columns', () => {
    // On main the whole OSM envelope was a solid wall from the ground to the deck. Rays across the
    // station a few metres above grade, midway between column rows, must now pass through.
    const pack = J<CorridorPack>('scene/king-memorial/corridor.json');
    const rail = buildEastRail(extended, rf, pack, eastGround, zero);
    const path = rf.paths.find(p => p.id === 'marta:path:155177')!;
    const project = makeProjector(extended.origin);
    const frame = (s: number) => {
      let i = 0;
      while (path.cum[i + 1] < s) i++;
      const [ax, az] = project(path.coords[2 * i], path.coords[2 * i + 1]);
      const [bx, bz] = project(path.coords[2 * i + 2], path.coords[2 * i + 3]);
      const len = Math.hypot(bx - ax, bz - az), t = (s - path.cum[i]) / (path.cum[i + 1] - path.cum[i]);
      return { x: ax + t * (bx - ax), z: az + t * (bz - az), nx: -(bz - az) / len, nz: (bx - ax) / len };
    };
    rail.mesh.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    const checked: number[] = [];
    // Columns stand every 18 m from s 8951; test midway. West and east open bays, and under the mezzanine.
    for (const s of [8978, 8996, 9032, 9068, 9122]) {
      const f = frame(s);
      const from = (v: number) => new THREE.Vector3(f.x + f.nx * v, 0, f.z + f.nz * v);
      const v0 = s >= ENCLOSURES.lobby.s[0] && s <= ENCLOSURES.lobby.s[1] ? ENCLOSURES.lobby.v[1] + 0.5 : -8.8, v1 = 14;
      const a = from(v0), c = from(v1);
      const y = Math.max(eastGround(a.x, a.z)!, eastGround(c.x, c.z)!) + 3;
      a.y = c.y = y;
      ray.set(a, c.clone().sub(a).normalize());
      ray.far = a.distanceTo(c);
      expect(ray.intersectObject(rail.mesh, false), `s ${s}`).toHaveLength(0);
      checked.push(s);
    }
    expect(checked).toHaveLength(5);
    // With the street level open, each column row outside the mezzanine carries the track deck: a ray
    // up from the ground under the track axis meets a crosshead before the deck soffit.
    let carried = 0;
    for (let s = rail.roofS[0] + 6; s < rail.roofS[1]; s += 18) {
      if (s > ENCLOSURES.mezzanine.s[0] - 1 && s < ENCLOSURES.mezzanine.s[1] + 1) continue;
      const f = frame(s), g = eastGround(f.x, f.z)!;
      ray.set(new THREE.Vector3(f.x, g + 0.5, f.z), new THREE.Vector3(0, 1, 0));
      ray.far = 40;
      const hit = ray.intersectObject(rail.mesh, false)[0];
      expect(hit, `s ${s}`).toBeDefined();
      expect(hit.point.y, `s ${s}`).toBeLessThan(rail.bed(s) + 0.25 - 1.2 - 0.5);
      carried++;
    }
    expect(carried).toBeGreaterThanOrEqual(5);
    // Nothing under the station (crossheads, mezzanine) rises into the trackway: straight down each
    // drawn track from 3 m above the bed, the first thing hit is the rail or the deck.
    let probed = 0;
    for (let s = 8945; s <= 9135; s += 2) for (const v of [-MARTA_TRACK_OFFSET, MARTA_TRACK_OFFSET]) {
      const f = frame(s), bedY = rail.bed(s);
      ray.set(new THREE.Vector3(f.x + f.nx * v, bedY + 3, f.z + f.nz * v), new THREE.Vector3(0, -1, 0));
      ray.far = 10;
      const hit = ray.intersectObject(rail.mesh, false)[0];
      expect(hit, `s ${s} v ${v}`).toBeDefined();
      expect(hit.point.y, `s ${s} v ${v}`).toBeLessThanOrEqual(bedY + 0.56 + 0.01);
      probed++;
    }
    expect(probed).toBeGreaterThan(150);
    // The station envelope is still the OSM footprint, and the enclosures sit inside it.
    expect(STATION_BUILDING).toHaveLength(26);
    rail.dispose();
  });
});
