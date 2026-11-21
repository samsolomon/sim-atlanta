/** Checks the baked downtown scene against the routes data and its own manifest. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { RoutesFile } from '../model/types';
import { elevationAt, makeProjector, type SceneManifest } from '../core/scene-data';
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
});
