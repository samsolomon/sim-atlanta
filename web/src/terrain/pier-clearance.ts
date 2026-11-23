import { roadWidth, type TransportRun } from './transport-data';
import { Line, segDist, type P2 } from '../vignette/geom';

type RoadLike = { cls: string; sub?: string | null; pts: P2[] };

/** What a pier must stand clear of: rendered Connector lanes, mapped roads at the width
 * transport.ts draws them plus 1 m, and railways at a locomotive's half-width plus margin
 * (the clearance transport.ts keeps for freight piers). Shared by every bridge that sets piers. */
export function pierObstacles(roads: readonly RoadLike[], onLanes: (x: number, z: number) => boolean,
  rail: readonly TransportRun[] = []) {
  const lines = [
    ...roads.filter((r) => r.pts.length > 1).map((r) => ({ line: new Line(r.pts), half: roadWidth(r as Parameters<typeof roadWidth>[0]) / 2 + 1 })),
    ...rail.filter((r) => r.pts.length > 1).map((r) => ({ line: new Line(r.pts), half: 3.8 })),
  ];
  const near = (line: Line, x: number, z: number, half: number) => {
    for (let i = 1; i < line.pts.length; i++) if (segDist(x, z, line.pts[i - 1], line.pts[i]) < half) return true;
    return false;
  };
  /** True when the rectangular pier footprint centred at (x, z), its long side along the
   * unit direction (dx, dz), touches neither a lane, a road nor a railway. */
  return function clear(x: number, z: number, dx: number, dz: number, halfAcross = 1.2, halfAlong = 1.1) {
    for (const [u, v] of [[-halfAcross, -halfAlong], [halfAcross, -halfAlong], [halfAcross, halfAlong], [-halfAcross, halfAlong], [0, 0]]) {
      // u across the bridge axis, v along it.
      const px = x + dz * u + dx * v, pz = z - dx * u + dz * v;
      if (onLanes(px, pz)) return false;
      if (lines.some(({ line, half }) => near(line, px, pz, half))) return false;
    }
    return true;
  };
}
