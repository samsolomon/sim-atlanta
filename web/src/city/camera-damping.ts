/**
 * Camera smoothing that feels the same at any frame rate. OrbitControls' damping, and City's
 * glide-to step, take a fixed fraction of the remaining motion each frame, so at 30 fps the camera
 * coasts twice as long as at 60 and at 120 half as long. Tuned per 60 Hz frame (the feel Sam has
 * approved), this turns that fraction into the one for the frame that actually elapsed.
 */

/** A frame longer than this counts as this long: one slow frame slows the camera, it doesn't jump. */
export const DAMPING_MAX_DT_MS = 50;
const FRAME_60_MS = 1000 / 60;

/** The fraction to apply this frame for `per60` per 60 Hz frame, after `dtMs` milliseconds. */
export function frameFraction(per60: number, dtMs: number) {
  const frames = Math.min(DAMPING_MAX_DT_MS, Math.max(0, dtMs)) / FRAME_60_MS;
  return 1 - Math.pow(1 - per60, frames);
}

/** The coast time constant implied by `per60` per 60 Hz frame (0.05 gives ~325 ms). */
export const coastTau = (per60: number) => (1000 / 60) / -Math.log(1 - per60);

/**
 * Direct manipulation's release: what a drag frame applied, as {t, amount}, gives the pointer's
 * average velocity over its last `windowMs`; an exponential coast at that velocity with time
 * constant `tauMs` travels velocity x tau in total. Holding still before release gives nothing.
 */
export function releaseCoast(trail: readonly { t: number; amount: number }[], now: number, tauMs: number, windowMs = 50) {
  const recent = trail.filter(d => now - d.t <= windowMs + 1000 / 60);
  if (!recent.length) return 0;
  const span = Math.max(1000 / 60, now - recent[0].t);
  return (recent.reduce((a, d) => a + d.amount, 0) / span) * tauMs;
}

/** The share of a pending wheel zoom to apply this frame (eased over ~3 x `easeMs`). */
export const wheelShare = (frameMs: number, easeMs: number) => 1 - Math.exp(-Math.min(DAMPING_MAX_DT_MS, Math.max(0, frameMs)) / easeMs);
