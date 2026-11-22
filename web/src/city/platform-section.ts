import type { PhysicalPlatform } from '../model/platforms';

/** A straight slab section in metres, increasing to the right of the reference
 * direction. Pass only the edges present along this section of the platform. */
export function platformSection(platform: PhysicalPlatform, bounds: readonly [number, number],
  trackOffsets: Readonly<Record<string, number>>, trackToLip: number) {
  let [min, max] = bounds;
  const lips: { v: number; inward: number }[] = [];
  for (const edge of platform.edges) {
    const inward = edge.side === 'right' ? 1 : -1;
    const v = trackOffsets[edge.trackId] + inward * trackToLip;
    if (!Number.isFinite(v)) throw new Error(`Missing boarding geometry for ${platform.id} at ${edge.trackId}`);
    // Two boardable lengths on the same boundary share a strip only when they
    // coincide. A staggered or curving platform needs separate longitudinal sections.
    const existing = lips.find(lip => lip.inward === inward);
    if (existing) {
      if (existing.v !== v) throw new Error(`Conflicting boarding edges in section of ${platform.id}`);
      continue;
    }
    if (inward === 1) min = v;
    else max = v;
    lips.push({ v, inward });
  }
  if (!(max > min)) throw new Error(`No width between platform boundaries for ${platform.id}`);
  return { min, max, lips };
}
