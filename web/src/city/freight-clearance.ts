import type { P2 } from '../vignette/geom';

/**
 * Curve clearance for illustrative freight (docs/freight-consists.md). CityFreight and the Norcross
 * freight both stand a car's two trucks on the drawn centreline at s ± trucks/2 and lay the body on
 * the chord between them, so on a curve the body's ends swing outward and its middle inward. The
 * rule: for every car kind a line can draw, on every chain of its drawn track, no body corner or
 * mid-side point moves more than MAX_CURVE_SWING_M further from the centreline than it sits on
 * straight track. It measures the swing itself, not a margin to however wide a board draws its
 * ballast. `freight-clearance.test.ts` applies it to each line's real geometry, so it decides new
 * car kinds and any edit to the drawn track. Downtown before smoothing (#512) swung 0.41–0.44 m.
 */
export const MAX_CURVE_SWING_M = 0.35;
/**
 * Overhead clearance: along every drawn freight chain, the lowest deck soffit over the railhead stays
 * at least this far above the tallest car the line can draw (a loaded double-stack well, 6.16 m).
 * Downtown's lowest soffit is 6.82–6.87 m, at the overpasses near (−44, −81) and (−182, −186).
 */
export const MIN_OVERHEAD_CLEARANCE_M = 0.5;

export interface CurveSwing {
  /** Largest extra distance of a body corner or mid-side point from the centreline, beyond its
   * straight-track distance (half the body width). */
  swing: number;
  /** Where on the line (truck midpoint) the worst case occurs. */
  at: P2;
}

function cumulative(pts: P2[]) {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return s;
}

function pointAt(pts: P2[], s: number[], d: number): P2 {
  let i = 1;
  while (i < pts.length - 1 && s[i] < d) i++;
  const t = (d - s[i - 1]) / (s[i] - s[i - 1] || 1);
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
}

/** Distance from q to the polyline between chainages lo and hi. */
function distanceToLine(pts: P2[], s: number[], q: P2, lo: number, hi: number) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    if (s[i] < lo || s[i - 1] > hi) continue;
    const [ax, az] = pts[i - 1], dx = pts[i][0] - ax, dz = pts[i][1] - az, l2 = dx * dx + dz * dz || 1e-12;
    const t = Math.max(0, Math.min(1, ((q[0] - ax) * dx + (q[1] - az) * dz) / l2));
    best = Math.min(best, Math.hypot(q[0] - ax - dx * t, q[1] - az - dz * t));
  }
  return best;
}

/**
 * The worst curve swing of a car (length over couplers, truck centres, half the body width) over
 * every position on `pts` where the whole car is on the line, stepping `step` metres. Positions
 * that hang past either end of the line are skipped: those ends are clipped at a board edge or
 * portal, never drawn beside the track.
 */
export function curveSwing(pts: P2[], length: number, trucks: number, halfWidth: number, step = 0.5): CurveSwing {
  const s = cumulative(pts), total = s[s.length - 1];
  let worst: CurveSwing = { swing: 0, at: pts[0] };
  for (let c = length / 2; c <= total - length / 2; c += step) {
    const nose = pointAt(pts, s, c + trucks / 2), tail = pointAt(pts, s, c - trucks / 2);
    const mx = (nose[0] + tail[0]) / 2, mz = (nose[1] + tail[1]) / 2;
    let ux = nose[0] - tail[0], uz = nose[1] - tail[1];
    const u = Math.hypot(ux, uz) || 1;
    ux /= u; uz /= u;
    const lo = c - length, hi = c + length;
    for (const along of [-length / 2, 0, length / 2]) {
      for (const side of [-halfWidth, halfWidth]) {
        const q: P2 = [mx + ux * along - uz * side, mz + uz * along + ux * side];
        const swing = distanceToLine(pts, s, q, lo, hi) - halfWidth;
        if (swing > worst.swing) worst = { swing, at: [mx, mz] };
      }
    }
  }
  return worst;
}
