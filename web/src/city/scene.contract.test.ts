/** Checks the baked downtown scene against the routes data and its own manifest. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { RoutesFile } from '../model/types';
import { elevationAt, makeProjector, railBedY, railSpanAt, type SceneManifest } from '../core/scene-data';
import { alignment } from '../vignette/alignment';
import { PORTAL_E } from '../vignette/world';

const dir = resolve(__dirname, '../../public/data/scene/downtown');
const has = existsSync(resolve(dir, 'scene.json'));

describe.skipIf(!has)('downtown scene data', () => {
  const manifest: SceneManifest = !has ? null! : JSON.parse(readFileSync(resolve(dir, 'scene.json'), 'utf8'));
  const routes: RoutesFile = !has ? null! : JSON.parse(readFileSync(resolve(dir, '../../ga/routes.json'), 'utf8'));
  it('profiles reference real heavy-rail paths and Five Points sits below ground', () => {
    const paths = new Map(routes.paths.map((p) => [p.id, p]));
    const project = makeProjector(manifest.origin);
    expect(Object.keys(manifest.profiles).length).toBeGreaterThan(10);
    for (const [id, prof] of Object.entries(manifest.profiles)) {
      const path = paths.get(id);
      expect(path, id).toBeDefined();
      // Find the point of this path nearest Five Points (scene origin).
      let best = { d: Infinity, s: 0 };
      for (let i = 0; i < path!.cum.length; i++) {
        const [x, z] = project(path!.coords[2 * i], path!.coords[2 * i + 1]);
        const d = Math.hypot(x, z);
        if (d < best.d) best = { d, s: path!.cum[i] };
      }
      if (best.d < 30) expect(elevationAt(prof, best.s), id).toBeLessThan(-5);
    }
  });

  it('the east-west line rides a viaduct east of downtown', () => {
    const paths = new Map(routes.paths.map((p) => [p.id, p]));
    const project = makeProjector(manifest.origin);
    const blue = Object.entries(manifest.profiles).filter(([id]) => paths.get(id)?.routeId === 'marta:route:BLUE');
    const elevatedEast = blue.some(([id, prof]) =>
      prof.z.some((z, i) => {
        if (z < 3) return false;
        const path = paths.get(id)!;
        const s = prof.s0 + i * prof.step;
        const j = path.cum.findIndex((c) => c >= s);
        const [x] = project(path.coords[2 * j], path.coords[2 * j + 1]);
        return x > 500;
      }),
    );
    expect(elevatedEast).toBe(true);
  });

  it('Blue/Green open to the sky only in the two verified cuts by Five Points, as City draws them', () => {
    // Ends of each cut from its OSM ways, checked on 2026-02-02 imagery (pipeline/src/scene.rs
    // VERIFIED_OPEN). City's open run must stop within 25 m of both ends, after alignment()
    // smoothing and the portal threshold, on every Blue/Green path that runs through it.
    const project = makeProjector(manifest.origin);
    const cuts = [
      { name: 'Gulch trench', ends: [project(-84.39365, 33.7551), project(-84.3925, 33.75443)] },
      { name: 'Five Points east cut', ends: [project(-84.3898, 33.75274), project(-84.38897, 33.75212)] },
    ];
    const board = { minX: -1000, maxX: 1000, minZ: -1300, maxZ: 700 }; // pipeline/scripts/vignette.py downtown
    const ew = Object.keys(manifest.profiles).filter((id) =>
      ['marta:route:BLUE', 'marta:route:GREEN'].includes(routes.paths.find((p) => p.id === id)!.routeId),
    );
    const checked = new Map(cuts.map((c) => [c.name, 0]));
    for (const id of ew) {
      const al = alignment(routes, manifest, board, id);
      const runs: [number, number][] = [];
      let open: number | null = null;
      for (let s = 0; s <= al.line.length; s += 1) {
        const ok = al.elev(s) >= PORTAL_E;
        if (ok && open == null) open = s;
        if (!ok && open != null) runs.push([open, s]), (open = null);
      }
      if (open != null) runs.push([open, al.line.length]);
      const dist = (s: number, q: [number, number]) => {
        const p = al.line.at(s);
        return Math.hypot(p.x - q[0], p.z - q[1]);
      };
      // Near Five Points, every open run must be one of the cuts.
      const near = runs.filter(([a, b]) => {
        const m = al.line.at((a + b) / 2);
        return Math.hypot(m.x, m.z) < 450;
      });
      for (const cut of cuts) {
        // Only paths that run right through the cut (some Blue trips start at a cut's end).
        const passes = cut.ends.every((q) => {
          for (let s = 60; s <= al.line.length - 60; s += 2) if (dist(s, q) < 40) return true;
          return false;
        });
        const run = near.find(([a, b]) => cut.ends.some((q) => Math.min(dist(a, q), dist(b, q)) < 25));
        if (!passes) continue;
        checked.set(cut.name, checked.get(cut.name)! + 1);
        expect(run, `${id} ${cut.name}`).toBeDefined();
        for (const q of cut.ends) expect(Math.min(dist(run![0], q), dist(run![1], q)), `${id} ${cut.name}`).toBeLessThan(25);
      }
      expect(near.length, `${id}: unexpected open run near Five Points`).toBeLessThanOrEqual(cuts.length);
    }
    for (const [name, n] of checked) expect(n, name).toBeGreaterThanOrEqual(6);
  });

  describe('observed rail cover (manifest.rail)', () => {
    const rail = manifest?.rail;
    const route = (id: string) => routes.paths.find((p) => p.id === id)!.routeId;
    const ew = () => Object.keys(rail!.paths).filter((id) => ['marta:route:BLUE', 'marta:route:GREEN'].includes(route(id)));
    /** Scene x/z of a path at s (linear between GTFS vertices). */
    const at = (id: string, s: number): [number, number] => {
      const p = routes.paths.find((q) => q.id === id)!;
      const project = makeProjector(manifest.origin);
      let j = p.cum.findIndex((c) => c >= s);
      if (j <= 0) j = 1;
      const t = (s - p.cum[j - 1]) / (p.cum[j] - p.cum[j - 1] || 1);
      const [ax, az] = project(p.coords[2 * j - 2], p.coords[2 * j - 1]);
      const [bx, bz] = project(p.coords[2 * j], p.coords[2 * j + 1]);
      return [ax + (bx - ax) * t, az + (bz - az) * t];
    };

    it('is version 1, track-bed datum, with sorted non-overlapping spans inside each profile', () => {
      expect(rail?.version).toBe(1);
      expect(rail!.datum).toBe('track-bed');
      for (const [id, spans] of Object.entries(rail!.paths)) {
        const prof = manifest.profiles[id];
        const hi = prof.s0 + prof.step * (prof.z.length - 1);
        spans.forEach((sp, i) => {
          expect(sp.s1, id).toBeGreaterThan(sp.s0);
          expect(sp.s0, id).toBeGreaterThanOrEqual(prof.s0);
          expect(sp.s1, id).toBeLessThanOrEqual(hi + 0.1);
          if (i) expect(sp.s0, id).toBeGreaterThanOrEqual(spans[i - 1].s1);
          expect(rail!.evidence[sp.ev], sp.ev).toBeDefined();
          // Only the Connector viaduct is measured (lidar anchors carry absolute beds); the rest is schematic.
          expect(sp.height, sp.ev).toBe(sp.ev === 'connector-viaduct' ? 'measured' : 'schematic');
          if (sp.height === 'measured') expect(sp.anchors!.some((a) => a.navd88 !== undefined), id).toBe(true);
          // Viaducts never follow the ground under them; open cuts sit on the DEM floor.
          if (sp.form === 'viaduct') expect(sp.base, id).toBe('anchors');
          if (sp.form === 'cut') expect([sp.base, sp.rel], id).toEqual(['ground', 0]);
        });
      }
    });

    it('gives both directions and both lines the same observations, mirrored', () => {
      const ids = ew();
      const len = (id: string, ev: string) => rail!.paths[id].filter((sp) => sp.ev === ev).map((sp) => sp.s1 - sp.s0)[0];
      for (const ev of ['gulch-trench', 'five-points-east-cut', 'gsu-west-open', 'gsu-canopy', 'gsu-floyd']) {
        const lens = ids.map((id) => len(id, ev)).filter((v) => v !== undefined);
        expect(lens.length, ev).toBeGreaterThanOrEqual(6);
        expect(Math.max(...lens) - Math.min(...lens), ev).toBeLessThan(15);
      }
      // Order along the path flips with direction.
      const east = rail!.paths['marta:path:155177'].map((sp) => sp.ev);
      const west = rail!.paths['marta:path:155188'].map((sp) => sp.ev);
      expect(west).toEqual([...east].reverse());
      expect(east).toEqual(['gulch-trench', 'five-points-east-cut', 'gsu-west-open', 'gsu-canopy', 'gsu-floyd', 'connector-viaduct']);
    });

    it('keeps the schematic bed continuous across every Georgia State seam, both directions', () => {
      // Any smooth bare-earth stand-in: a slope east with some relief.
      const ground = (x: number, z: number) => -0.03 * x + 0.01 * z + 2 * Math.sin(x / 40);
      for (const id of ew()) {
        const spans = rail!.paths[id];
        for (let i = 1; i < spans.length; i++) {
          const [a, b] = [spans[i - 1], spans[i]];
          if (Math.abs(a.s1 - b.s0) > 0.01 || !a.ev.startsWith('gsu') && !b.ev.startsWith('gsu') && b.ev !== 'connector-viaduct') continue;
          for (const zero of [undefined, 323.8]) {
            const yA = railBedY(a, a.s1 - 0.01, ground(...at(id, a.s1 - 0.01)), ground, zero);
            const yB = railBedY(b, b.s0 + 0.01, ground(...at(id, b.s0 + 0.01)), ground, zero);
            expect(Math.abs(yA - yB), `${id} ${a.ev}|${b.ev} zero ${zero}`).toBeLessThan(0.25);
          }
        }
      }
    });

    it('falls back to the legacy profile where nothing was observed', () => {
      // Five Points station itself (scene origin) is not covered by any span.
      for (const id of ew()) {
        const p = routes.paths.find((q) => q.id === id)!;
        const project = makeProjector(manifest.origin);
        let best = { d: Infinity, s: 0 };
        for (let i = 0; i < p.cum.length; i++) {
          const [x, z] = project(p.coords[2 * i], p.coords[2 * i + 1]);
          if (Math.hypot(x, z) < best.d) best = { d: Math.hypot(x, z), s: p.cum[i] };
        }
        if (best.d < 30) expect(railSpanAt(rail, id, best.s), id).toBeNull();
      }
    });
  });
});
