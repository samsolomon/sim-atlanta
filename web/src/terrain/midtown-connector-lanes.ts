import type { Ribbon } from './connector-corridor';

/** The outside I-75 through driver merges one lane inward south of 14th
 * before the outside auxiliary lane becomes exit-only at Williams. */
export function midtownThroughLane(ribbon: Ribbon, lane: number) {
  return ribbon.id === 337901433 && lane === 6 ? 5 : lane;
}

export function trafficLaneFraction(lane: number, exitLane: number, lanes: number, s: number) {
  const t = Math.max(0, Math.min(1, (s - 90) / 160));
  return (lane + (exitLane - lane) * t * t * (3 - 2*t) + .5) / lanes;
}
