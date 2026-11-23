/** City's orbit stops at 150 m, too far to review a bench or a gate. In a dev build,
 * `?dev&mindist=20` lowers that limit (to no less than 5 m) for close review shots. */
export const ORBIT_MIN = 150;

export function minOrbitDistance(query: URLSearchParams, dev: boolean) {
  const asked = Number(query.get('mindist'));
  if (!dev || !query.has('dev') || !query.has('mindist') || !Number.isFinite(asked)) return ORBIT_MIN;
  return Math.min(ORBIT_MIN, Math.max(5, asked));
}
