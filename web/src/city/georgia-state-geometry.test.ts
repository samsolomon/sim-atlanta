import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeProjector, type SceneManifest } from '../core/scene-data';
import type { RoutesFile } from '../model/types';
import { GEORGIA_STATE, georgiaStateScene } from './georgia-state-geometry';

const origin = { lon: -84.3916, lat: 33.7539 };
const g = georgiaStateScene(origin);
const [south, north] = g.platforms;

describe('Georgia State surveyed geometry', () => {
  it('has two ~186 m side platforms: 71 m under canopies, then 116 m under the Floyd Building', () => {
    for (const p of g.platforms) {
      expect(p.u1 - p.u0).toBeGreaterThan(184);
      expect(p.u1 - p.u0).toBeLessThan(188);
      expect(-p.canopy[0]).toBeCloseTo(70.8, 0);
      expect(p.underBuilding[1]).toBeCloseTo(g.faces.se.u, 0); // each platform ends at the SE face
      expect(Math.abs(p.outer - p.inner)).toBeGreaterThan(5); // 5.3 / 5.7 m as drawn; see the doc on inner edges
      expect(Math.abs(p.outer - p.inner)).toBeLessThan(6);
    }
    expect(g.faces.se.u).toBeCloseTo(115.7, 0);
    expect(g.westTip).toBeCloseTo(-71.0, 0);
  });

  it('puts the south platform beside ER and the north platform beside EL, with the tracks between', () => {
    expect([south.side, south.track, north.side, north.track]).toEqual(['south', 'ER', 'north', 'EL']);
    for (const face of [g.faces.nw, g.faces.se]) {
      const er = g.toFrame(...face.tracks.ER).v, el = g.toFrame(...face.tracks.EL).v;
      expect(er).toBeCloseTo(2.43, 1); // 4.86 m track spacing, centred on the axis
      expect(el).toBeCloseTo(-2.43, 1);
      expect(south.inner).toBeGreaterThan(0);
      expect(north.inner).toBeLessThan(0);
      expect(south.outer).toBeGreaterThan(er);
      expect(north.outer).toBeLessThan(el);
      expect(face.opening[0]).toBeCloseTo(north.outer);
      expect(face.opening[1]).toBeCloseTo(south.outer);
    }
    // The NE wall of the building is the north platform's outer edge (0.6 m apart as drawn).
    expect(Math.abs(north.outer - g.toFrame(...g.faces.se.wall[1]).v)).toBeLessThan(1);
    // OSM draws both inner edges ~0.7 m from their track centre, inside a car's half-width (1.6 m):
    // the inner edges are not usable as drawn, so callers fit them to the running track.
    expect(south.inner - 2.43).toBeLessThan(1);
    expect(-2.43 - north.inner).toBeLessThan(1);
  });

  it('crosses each wall at its tunnel=building_passage end node, square to the track', () => {
    for (const face of [g.faces.nw, g.faces.se]) {
      const [a, b] = face.wall;
      const wall = [b[0] - a[0], b[1] - a[1]], len = Math.hypot(wall[0], wall[1]);
      expect(len).toBeCloseTo(62.1, 0);
      expect(Math.abs(wall[0] * g.along[0] + wall[1] * g.along[1]) / len).toBeLessThan(0.02); // within ~1°
      for (const t of [face.tracks.ER, face.tracks.EL]) {
        const cross = ((t[0] - a[0]) * wall[1] - (t[1] - a[1]) * wall[0]) / len;
        expect(Math.abs(cross)).toBeLessThan(0.3);
      }
    }
  });

  it('round-trips the station frame', () => {
    const [x, z] = g.fromFrame(37, -3);
    const f = g.toFrame(x, z);
    expect(f.u).toBeCloseTo(37);
    expect(f.v).toBeCloseTo(-3);
    expect(GEORGIA_STATE.platforms.map((p) => p.ring.length)).toEqual([9, 9]);
  });
});

// Directed cover: the baked rail spans on every staged East Line path must change cover at the
// surveyed lines, in travel order, both ways.
const data = resolve(__dirname, '../../public/data');
const staged = ['scene/downtown/scene.json', 'ga/routes.json'].every((f) => existsSync(resolve(data, f)));

describe.skipIf(!staged)('baked Georgia State cover against the survey', () => {
  const J = <T>(f: string): T => JSON.parse(readFileSync(resolve(data, f), 'utf8'));
  const manifest = staged ? J<SceneManifest>('scene/downtown/scene.json') : null!;
  const rf = staged ? J<RoutesFile>('ga/routes.json') : null!;
  const P = makeProjector(manifest?.origin ?? origin);
  const sg = georgiaStateScene(manifest?.origin ?? origin);

  /** s of the path's nearest point to the station frame's axis at u. */
  const sAt = (coords: number[], cum: number[], u: number) => {
    const [px, pz] = sg.fromFrame(u, 0);
    let best = { d: Infinity, s: 0, lat: 0 };
    for (let i = 0; i + 3 < coords.length; i += 2) {
      const [ax, az] = P(coords[i], coords[i + 1]), [bx, bz] = P(coords[i + 2], coords[i + 3]);
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
      if (!l2) continue;
      const t = Math.min(1, Math.max(0, ((px - ax) * dx + (pz - az) * dz) / l2));
      const qx = ax + t * dx, qz = az + t * dz, d = Math.hypot(px - qx, pz - qz);
      if (d < best.d) best = { d, s: cum[i / 2] + t * (cum[i / 2 + 1] - cum[i / 2]), lat: d };
    }
    return best;
  };

  const ids = staged ? Object.keys(manifest.rail!.paths).filter((id) => manifest.rail!.paths[id].some((sp) => sp.ev === 'gsu-floyd')) : [];

  it('covers all ten through paths', () => expect(ids.length).toBe(10));

  it('changes cover at the west tips, the NW face and the SE face in travel order', () => {
    for (const id of ids) {
      const path = rf.paths.find((p) => p.id === id)!;
      const spans = manifest.rail!.paths[id];
      const by = (ev: string) => spans.find((sp) => sp.ev === ev)!;
      const [tip, nw, se] = [sg.westTip, 0, sg.faces.se.u].map((u) => sAt(path.coords, path.cum, u));
      const eastbound = se.s > tip.s;
      // The drawn line runs ~2.3 m off the OSM axis here; it must stay within the lateral budget.
      for (const q of [tip, nw, se]) expect(q.lat, id).toBeLessThan(3);
      const seq = eastbound
        ? [['gsu-west-open', 'open'], ['gsu-canopy', 'roofed'], ['gsu-floyd', 'covered'], ['connector-viaduct', 'open']]
        : [['connector-viaduct', 'open'], ['gsu-floyd', 'covered'], ['gsu-canopy', 'roofed'], ['gsu-west-open', 'open']];
      const ordered = spans.filter((sp) => seq.some(([ev]) => ev === sp.ev)).sort((a, b) => a.s0 - b.s0);
      expect(ordered.map((sp) => [sp.ev, sp.cover]), id).toEqual(seq);
      // Each change of cover is where the survey says, to the baked 0.1 m rounding plus 1 m.
      const at = (ev: string, end: 's0' | 's1') => by(ev)[end];
      const edges = eastbound
        ? [[at('gsu-canopy', 's0'), tip.s], [at('gsu-floyd', 's0'), nw.s], [at('gsu-floyd', 's1'), se.s]]
        : [[at('gsu-canopy', 's1'), tip.s], [at('gsu-floyd', 's1'), nw.s], [at('gsu-floyd', 's0'), se.s]];
      for (const [baked, surveyed] of edges) expect(Math.abs(baked - surveyed), id).toBeLessThan(1);
    }
  });
});
