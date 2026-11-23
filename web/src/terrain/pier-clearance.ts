import { roadWidth, type TransportRun } from './transport-data';
import { segDist, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';

type RoadLike = { cls: string; sub?: string | null; pts: P2[] };
type Segment<R> = { a: P2; b: P2; half: number; road?: R };

/** What a pier must stand clear of: rendered Connector lanes, mapped roads at the width
 * transport.ts draws them plus 1 m, and railways at a locomotive's half-width plus margin
 * (the clearance transport.ts keeps for freight piers). Shared by every bridge that sets piers.
 * Segments are indexed once, so one call can serve every deck of an area. */
export function pierObstacles<R extends RoadLike>(roads: readonly R[], onLanes: (x: number, z: number) => boolean,
  rail: readonly TransportRun[] = []) {
  const index = new PlacementIndex<Segment<R>>(32);
  const add = (pts: P2[], half: number, road?: R) => {
    for (let i = 1; i < pts.length; i++) {
      const seg = { a: pts[i - 1], b: pts[i], half, road };
      index.add(seg, [seg.a, seg.b], half);
    }
  };
  for (const r of roads) if (r.pts.length > 1) add(r.pts, roadWidth(r as Parameters<typeof roadWidth>[0]) / 2 + 1, r);
  for (const r of rail) if (r.pts.length > 1) add(r.pts, 3.8);
  /** True when the rectangular pier footprint centred at (x, z), its long side along the
   * unit direction (dx, dz), touches neither a lane, a road nor a railway. `ignore` skips
   * roads that ride on the bridge itself (its own street and sidewalks). */
  return function clear(x: number, z: number, dx: number, dz: number, halfAcross = 1.2, halfAlong = 1.1,
    ignore?: (road: R) => boolean) {
    for (const [u, v] of [[-halfAcross, -halfAlong], [halfAcross, -halfAlong], [halfAcross, halfAlong], [-halfAcross, halfAlong], [0, 0]]) {
      // u across the bridge axis, v along it.
      const px = x + dz * u + dx * v, pz = z - dx * u + dz * v;
      if (onLanes(px, pz)) return false;
      for (const s of index.at(px, pz)) {
        if (s.road && ignore?.(s.road)) continue;
        if (segDist(px, pz, s.a, s.b) < s.half) return false;
      }
    }
    return true;
  };
}
