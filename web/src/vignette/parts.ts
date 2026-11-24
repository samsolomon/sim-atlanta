import { pointInRing, type P2 } from './geom';

export type Part = { id?: string; rings: P2[][]; h: number; minH?: number };

/** Canopies, marquees, awnings and upper floors over an open ground storey are lifted
 * a few metres on purpose (the Fox Theatre marquee sits at 7.4 m). Only parts lifted at
 * least this high are candidates: floating roofs appear at tower height. */
export const MIN_LIFT_M = 15;

/** Sample points inside a ring on a grid of about `n` × `n` over its bounding box. */
function samples(ring: P2[], n = 12): P2[] {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const out: P2[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = x0 + (x1 - x0) * (i + 0.5) / n, z = z0 + (z1 - z0) * (j + 0.5) / n;
    if (pointInRing(x, z, ring)) out.push([x, z]);
  }
  return out;
}

/** A skybridge rests on parts at both ends of its long axis and spans open air between. */
function bridges(pts: P2[], held: P2[]) {
  if (!held.length) return false;
  const xs = pts.map(([x]) => x), zs = pts.map(([, z]) => z);
  const dx = Math.max(...xs) - Math.min(...xs), dz = Math.max(...zs) - Math.min(...zs);
  const axis = dx >= dz ? 0 : 1, lo = Math.min(...pts.map((p) => p[axis])), span = Math.max(dx, dz);
  const t = held.map((p) => (p[axis] - lo) / span);
  return t.some((v) => v < 0.25) && t.some((v) => v > 0.75);
}

/**
 * Mapped building parts sometimes lift a part (minH > 0) with nothing mapped underneath it.
 * Norfolk Southern's headquarters maps its towers only as `building:part=roof` slabs at
 * 45 and 72 m, which drew as thin slabs floating over the podium. A lifted part whose
 * footprint is less than half supported by parts reaching its base is extruded down to the
 * highest part beneath it, or to grade. Only parts lifted at least MIN_LIFT_M are touched. Supported parts (skybridges, cantilevers over a
 * mapped mass, overhangs) are left as mapped. Lowest parts settle first, so stacked
 * floating slabs come to rest on each other.
 */
export function groundLiftedParts<T extends Part>(parts: readonly T[]): T[] {
  const out = parts.map((p) => ({ ...p }));
  const order = out.map((_, i) => i).filter((i) => (out[i].minH ?? 0) >= MIN_LIFT_M)
    .sort((a, b) => (out[a].minH ?? 0) - (out[b].minH ?? 0));
  for (const i of order) {
    const p = out[i], lo = p.minH ?? 0, ring = p.rings[0];
    if (!ring || ring.length < 3) continue;
    const pts = samples(ring);
    if (!pts.length) continue;
    const others = out.filter((q, k) => k !== i && q.rings[0]?.length >= 3);
    const reaches = others.filter((q) => q.h >= lo - 2 && (q.minH ?? 0) < lo);
    const held = pts.filter(([x, z]) => reaches.some((q) => pointInRing(x, z, q.rings[0])));
    if (held.length / pts.length >= 0.5 || bridges(pts, held)) continue;
    let floor = 0;
    for (const q of others) {
      if (q.h > lo + 0.01) continue;
      if (pts.some(([x, z]) => pointInRing(x, z, q.rings[0]))) floor = Math.max(floor, q.h);
    }
    p.minH = floor;
  }
  return out;
}
