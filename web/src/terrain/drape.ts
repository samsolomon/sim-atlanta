/**
 * Drape: lay a ground-following surface onto the terrain triangles that are
 * actually drawn, at either tier.
 *
 * A surface sampled at its own vertices (every 2 m along a strip, or on a 1 m
 * grid) is a chord of the terrain. Wherever a terrain crease runs between those
 * vertices, the ground bulges through it. `drapeTriangle` splits one surface
 * triangle along every drawn terrain edge beneath it and raises each new vertex
 * to at least `terrain + lift`. On each piece both the surface and the terrain
 * are planar, so the linear interpolation of that max stays at or above both
 * everywhere: nothing can poke through, and a raised surface never moves down.
 * `maxRaise` bounds the lift to crease-sized bulges for surfaces whose height is
 * deliberate (a graded rail cut); deeper sites keep their height and stay visible
 * to the ground audit.
 */

/** Drawn terrain triangles, as GroundSurface exposes them. */
export interface TriangleSource {
  /** Visit every drawn triangle whose plan may overlap the box, as nine scene coordinates. */
  trianglesIn(minX: number, maxX: number, minZ: number, maxZ: number,
    visit: (ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number) => void): void;
}

/** A ground sampler that can also hand out its drawn triangles. */
export type DrapeGround = ((x: number, z: number) => number | null) & { triangles?: TriangleSource };

/** A draped vertex: position, plus barycentric weights in the source triangle for its other attributes. */
export type DrapedVertex = [x: number, y: number, z: number, wa: number, wb: number, wc: number];

type V = readonly number[];

/**
 * Split triangle abc (scene x, y, z) along the drawn terrain and emit its pieces,
 * in abc's winding, raised to at least terrain + lift. Where some of abc lies over
 * a void or off the board, abc is emitted unchanged: there is no terrain to clear.
 */
export function drapeTriangle(src: TriangleSource, a: V, b: V, c: V, lift: number,
  emit: (p: DrapedVertex, q: DrapedVertex, r: DrapedVertex) => void, maxRaise = Infinity, drapeAtVoid = false) {
  const area = (b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]);
  const whole = () => emit([a[0], a[1], a[2], 1, 0, 0], [b[0], b[1], b[2], 0, 1, 0], [c[0], c[1], c[2], 0, 0, 1]);
  if (Math.abs(area) < 1e-9) { whole(); return; }
  // Barycentric weights in abc for a plan point.
  const weights = (x: number, z: number): [number, number, number] => {
    const wb = ((x - a[0]) * (c[2] - a[2]) - (z - a[2]) * (c[0] - a[0])) / area;
    const wc = ((b[0] - a[0]) * (z - a[2]) - (b[2] - a[2]) * (x - a[0])) / area;
    return [1 - wb - wc, wb, wc];
  };
  const pieces: DrapedVertex[][] = [];
  let covered = 0;
  const minX = Math.min(a[0], b[0], c[0]), maxX = Math.max(a[0], b[0], c[0]);
  const minZ = Math.min(a[2], b[2], c[2]), maxZ = Math.max(a[2], b[2], c[2]);
  src.trianglesIn(minX, maxX, minZ, maxZ, (ax, ay, az, bx, by, bz, cx, cy, cz) => {
    if (Math.max(ax, bx, cx) < minX || Math.min(ax, bx, cx) > maxX || Math.max(az, bz, cz) < minZ || Math.min(az, bz, cz) > maxZ) return;
    const det = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
    if (Math.abs(det) < 1e-9) return;          // vertical skirt
    // Clip abc's plan against the terrain triangle's three edges (inside >= 0).
    const s = Math.sign(det);
    const edges: [number, number, number, number][] = [[ax, az, bx, bz], [bx, bz, cx, cz], [cx, cz, ax, az]];
    let poly: [number, number][] = [[a[0], a[2]], [b[0], b[2]], [c[0], c[2]]];
    for (const [px, pz, qx, qz] of edges) {
      const d = (x: number, z: number) => s * ((qx - px) * (z - pz) - (qz - pz) * (x - px));
      const next: [number, number][] = [];
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i], q = poly[(i + 1) % poly.length], dp = d(...p), dq = d(...q);
        if (dp >= 0) next.push(p);
        if ((dp > 0 && dq < 0) || (dp < 0 && dq > 0)) {
          const t = dp / (dp - dq);
          next.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
        }
      }
      poly = next;
      if (poly.length < 3) return;
    }
    let part = 0;
    for (let i = 1; i + 1 < poly.length; i++)
      part += (poly[i][0] - poly[0][0]) * (poly[i + 1][1] - poly[0][1]) - (poly[i][1] - poly[0][1]) * (poly[i + 1][0] - poly[0][0]);
    if (Math.abs(part) < 1e-10) return;
    covered += Math.abs(part);
    const terrain = (x: number, z: number) => {
      const u = ((x - ax) * (cz - az) - (z - az) * (cx - ax)) / det, v = ((bx - ax) * (z - az) - (bz - az) * (x - ax)) / det;
      return (1 - u - v) * ay + u * by + v * cy;
    };
    pieces.push(poly.map(([x, z]) => {
      const w = weights(x, z), own = w[0] * a[1] + w[1] * b[1] + w[2] * c[1];
      return [x, Math.min(own + maxRaise, Math.max(own, terrain(x, z) + lift)), z, ...w];
    }));
  });
  // Shared edges and float rounding leave slivers; demand near-complete cover.
  if (covered < Math.abs(area) * (1 - 1e-4)) {
    if (!drapeAtVoid || !pieces.length) { whole(); return; }
    // A tunnel lid spans the void. Keep its original height over the opening
    // and raise just the pieces lying on drawn ground.
    let uncovered: V[][] = [[a, b, c]];
    for (const poly of pieces) {
      const ring = poly.map(([x, , z]) => [x, z] as const);
      const remaining: V[][] = [];
      for (const [p, q, r] of uncovered) {
        cutOut(p, q, r, ring, (u, v, w) => remaining.push([u, v, w]));
      }
      uncovered = remaining;
    }
    const vertex = (p: V): DrapedVertex => [p[0], p[1], p[2], ...weights(p[0], p[2])];
    for (const [p, q, r] of uncovered) emit(vertex(p), vertex(q), vertex(r));
  }
  for (const poly of pieces) for (let i = 1; i + 1 < poly.length; i++) emit(poly[0], poly[i], poly[i + 1]);
}

/**
 * Emit the parts of triangle abc that lie outside the convex plan `ring`, with
 * heights interpolated on abc. Ground covers use it to leave a hard surface's
 * footprint (a stair run's GroundYield ring) to the stone.
 */
export function cutOut(a: V, b: V, c: V, ring: readonly (readonly [number, number])[],
  emit: (p: number[], q: number[], r: number[]) => void) {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [px, pz] = ring[i], [qx, qz] = ring[(i + 1) % ring.length];
    area += px * qz - qx * pz;
  }
  const s = Math.sign(area);
  let inside: number[][] = [[...a], [...b], [...c]];
  const out: number[][][] = [];
  for (let i = 0; i < ring.length && inside.length >= 3; i++) {
    const [px, pz] = ring[i], [qx, qz] = ring[(i + 1) % ring.length];
    const d = (v: number[]) => s * ((qx - px) * (v[2] - pz) - (qz - pz) * (v[0] - px));
    const pos: number[][] = [], neg: number[][] = [];
    for (let j = 0; j < inside.length; j++) {
      const p = inside[j], q = inside[(j + 1) % inside.length], dp = d(p), dq = d(q);
      if (dp >= 0) pos.push(p);
      if (dp <= 0) neg.push(p);
      if ((dp > 0 && dq < 0) || (dp < 0 && dq > 0)) {
        const t = dp / (dp - dq), m = [0, 1, 2].map(k => p[k] + t * (q[k] - p[k]));
        pos.push(m); neg.push(m);
      }
    }
    if (neg.length >= 3) out.push(neg);
    inside = pos;
  }
  if (inside.length < 3) { emit([...a], [...b], [...c]); return; }   // abc misses the ring
  for (const poly of out) for (let i = 1; i + 1 < poly.length; i++) emit(poly[0], poly[i], poly[i + 1]);
}
