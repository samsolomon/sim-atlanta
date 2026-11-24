/**
 * Ring decisions for the streaming prototype (?stream=1). Pure, so the hysteresis is testable.
 *
 * near:     the area's full City build (today's detail)
 * mid:      a cheap LOD (coarse ground, merged building blocks, forest mass)
 * unloaded: nothing on the GPU or the heap
 *
 * The metric is the eye's distance to the nearest point of the area's box. Fog sets the far edge:
 * City's fog reaches full strength at 3x the orbit distance, so an area past that is invisible
 * anyway and unloads. Each boundary has a gap between its in and out radii, and an area must stay
 * in a ring for a minimum dwell before it can be demoted, so a pan or orbit that wobbles across a
 * boundary does not reload the area.
 */
export type Ring = 'near' | 'mid' | 'unloaded';

export interface RingConfig {
  /** Promote to near inside this eye distance (metres). */
  nearIn: number;
  /** Demote from near beyond this eye distance. */
  nearOut: number;
  /** The mid ring's outer limit when fog does not cut it shorter. */
  midMax: number;
  /** An area that has been off-screen this long (and is not near) unloads. */
  offscreenMs: number;
  /** Minimum time in a ring before a demotion. */
  dwellMs: number;
  /** Full builds (one long main-thread job) wait until the camera has rested this long... */
  restMs: number;
  /** ...or until a near section has waited this long (follow mode never rests). */
  maxWaitMs: number;
}

export function ringConfig(low: boolean, query?: URLSearchParams): RingConfig {
  const num = (key: string, fallback: number) => {
    const v = Number(query?.get(key));
    return query?.has(key) && Number.isFinite(v) && v > 0 ? v : fallback;
  };
  // City's 22° lens makes a 3 km orbit read like 1 km on a normal lens, so the near ring is wide.
  const nearIn = num('near', low ? 3000 : 4500);
  return {
    nearIn,
    nearOut: num('nearOut', nearIn * 1.3),
    midMax: num('mid', 40000),
    offscreenMs: num('offscreen', 6000),
    dwellMs: num('dwell', 4000),
    restMs: query?.get('rest') === '0' ? 0 : num('rest', 400),
    maxWaitMs: num('maxwait', 2500),
  };
}

export interface RingInput {
  /** Eye distance to the area's box, metres. */
  distance: number;
  /** Fog's full-strength distance, metres. */
  fogFar: number;
  /** In the camera frustum now. */
  visible: boolean;
  /** How long the area has been continuously off-screen, ms. */
  offscreenFor: number;
  /** How long the area has been in its current ring, ms. */
  inRingFor: number;
  /** A camera link, search result or followed vehicle points here: draw at least the LOD now,
   *  on or off screen, and let distance decide whether it goes near. */
  needed?: boolean;
  /** The orbit target lies on this area (within a margin): it is what the view is about. */
  atTarget?: boolean;
}

export function nextRing(current: Ring, input: RingInput, cfg: RingConfig): Ring {
  const { distance: d, visible, offscreenFor, inRingFor, needed } = input;
  const midOut = Math.min(cfg.midMax, input.fogFar);
  const midIn = midOut * 0.85;
  // Fog also bounds the near ring: a close orbit sees only a few hundred metres.
  const nearIn = Math.min(cfg.nearIn, input.fogFar * 0.8);
  const nearOut = Math.min(cfg.nearOut, input.fogFar);
  if (d < nearIn || (input.atTarget && d < input.fogFar)) return 'near';
  const canDemote = inRingFor >= cfg.dwellMs && !needed;
  switch (current) {
    case 'near':
      if (d <= nearOut || input.atTarget || !canDemote) return 'near';
      return d > midOut ? 'unloaded' : 'mid';
    case 'mid':
      if (!canDemote) return 'mid';
      if (d > midOut || (!visible && offscreenFor >= cfg.offscreenMs)) return 'unloaded';
      return 'mid';
    case 'unloaded':
      return needed || (visible && d < midIn) ? 'mid' : 'unloaded';
  }
}

export interface Box { minX: number; maxX: number; minZ: number; maxZ: number }

/** Eye distance to a box lying on the ground plane at height y. */
export function boxDistance(b: Box, x: number, y: number, z: number, groundY = 0) {
  const dx = Math.max(b.minX - x, 0, x - b.maxX);
  const dz = Math.max(b.minZ - z, 0, z - b.maxZ);
  return Math.hypot(dx, dz, y - groundY);
}
