/** Checks the baked downtown scene against the routes data and its own manifest. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { RoutesFile } from '../model/types';
import { elevationAt, makeProjector, type SceneManifest } from '../core/scene-data';

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
});
