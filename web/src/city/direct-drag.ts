import type { Spherical, Vector3 } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { coastTau, releaseCoast } from './camera-damping';

/** Bind before City wraps update(): release may have to apply a last pointer move between frames. */
export function bindDirectDrag(controls: OrbitControls, per60: number) {
  const orbit = controls as unknown as { state: number; _panOffset: Vector3; _sphericalDelta: Spherical };
  const pan = orbit._panOffset, angles = orbit._sphericalDelta;
  const update = controls.update.bind(controls);
  const tau = coastTau(per60);
  const trail: { t: number; pan: Vector3; theta: number; phi: number }[] = [];
  let active = false;

  function start() {
    // Wheel zoom also emits start/end, in NONE. Touch transitions can emit a second start.
    if (active || orbit.state === -1) return;
    active = true;
    pan.set(0, 0, 0);
    angles.theta = angles.phi = 0;
  }

  function sample(now: number) {
    trail.push({ t: now, pan: pan.clone(), theta: angles.theta, phi: angles.phi });
    while (trail.length && now - trail[0].t > 120) trail.shift();
  }

  function frame(now: number) {
    if (!active) return;
    controls.dampingFactor = 1;
    sample(now);
  }

  function end() {
    if (!active) return;
    active = false;
    const now = performance.now();
    if (pan.lengthSq() || angles.theta || angles.phi) {
      sample(now);
      controls.dampingFactor = 1;
      update(); // Spend the pending displacement exactly once before seeding inertia.
    }
    const coast = (pick: (d: typeof trail[number]) => number) =>
      releaseCoast(trail.map(d => ({ t: d.t, amount: pick(d) })), now, tau);
    pan.set(coast(d => d.pan.x), coast(d => d.pan.y), coast(d => d.pan.z));
    angles.theta = coast(d => d.theta);
    angles.phi = coast(d => d.phi);
    trail.length = 0;
  }

  controls.addEventListener('start', start);
  controls.addEventListener('end', end);
  function dispose() {
    controls.removeEventListener('start', start);
    controls.removeEventListener('end', end);
  }
  return { frame, dispose };
}
