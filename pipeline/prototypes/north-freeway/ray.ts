// Independent vertical ray against the asphalt triangles uploaded by City.
import { Color, Mesh, Ray, Vector3 } from '../../../web/node_modules/three';
import type { SurfaceTransport } from '../../../web/src/terrain/transport';
import { PAL } from '../../../web/src/vignette/world';

export function pavementRays(transport: SurfaceTransport) {
  const object = transport.group.getObjectByName('Decks and embedded rails') as Mesh;
  const cells = new Map<string, Vector3[][]>();
  const step = 16;
  const paint = new Color(PAL.asphaltHwy);
  if (object) {
    const g = object.geometry,
      p = g.getAttribute('position'),
      c = g.getAttribute('color');
    for (let i = 0; i < p.count; i += 3) {
      if (
        Math.abs(c.getX(i) - paint.r) > 1e-6 ||
        Math.abs(c.getY(i) - paint.g) > 1e-6 ||
        Math.abs(c.getZ(i) - paint.b) > 1e-6
      )
        continue;
      const tri = [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(p, i + k));
      const xs = tri.map((p) => Math.floor(p.x / step)),
        zs = tri.map((p) => Math.floor(p.z / step));
      for (let x = Math.min(...xs); x <= Math.max(...xs); x++)
        for (let z = Math.min(...zs); z <= Math.max(...zs); z++) {
          const key = x + ',' + z;
          if (!cells.has(key)) cells.set(key, []);
          cells.get(key)!.push(tri);
        }
    }
  }
  const ray = new Ray(new Vector3(), new Vector3(0, -1, 0)),
    hit = new Vector3();
  return (x: number, z: number) => {
    ray.origin.set(x, 300, z);
    let y = -Infinity;
    for (const [a, b, c] of cells.get(Math.floor(x / step) + ',' + Math.floor(z / step)) ?? []) {
      if (ray.intersectTriangle(a, b, c, false, hit)) y = Math.max(y, hit.y);
    }
    return Number.isFinite(y) ? y : null;
  };
}
