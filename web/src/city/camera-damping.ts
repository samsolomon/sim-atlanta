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
