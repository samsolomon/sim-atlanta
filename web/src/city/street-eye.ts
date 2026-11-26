// City orbit angles are measured from vertical. Close to a subject the same
// tilt gesture crosses the horizon; zooming back out restores the board view.
import { MathUtils } from 'three';

export const STREET_MAX_TILT = 103;
export const ORBIT_TILT = 70;

export function maxStreetTilt(distance: number) {
  return MathUtils.lerp(STREET_MAX_TILT, ORBIT_TILT, MathUtils.smoothstep(distance, 300, 600));
}

export function minStreetDistance(tilt: number, orbitMin: number) {
  return MathUtils.lerp(orbitMin, Math.min(orbitMin, 50), MathUtils.smoothstep(tilt, ORBIT_TILT, 89));
}

export function streetBlend(tilt: number) {
  return MathUtils.smoothstep(tilt, ORBIT_TILT, 90);
}

export function streetFov(blend: number, distance: number) {
  // A tighter lens near a subject, a wider field of view across a plaza.
  return MathUtils.lerp(22, MathUtils.lerp(34, 47, MathUtils.smoothstep(distance, 80, 270)), blend);
}
