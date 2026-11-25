import { expect, it, vi } from 'vitest';
import { PerspectiveCamera, type Spherical, type Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { bindDirectDrag } from './direct-drag';

it.each(['pan', 'rotate'] as const)('arrests a %s coast on re-grab and spends the last move before release once', gesture => {
  const camera = new PerspectiveCamera();
  camera.position.set(0, 10, 100);
  const controls = new OrbitControls(camera);
  controls.enableDamping = true;
  const orbit = controls as unknown as { state: number; _panOffset: Vector3; _sphericalDelta: Spherical };
  const input = (delta: number) => {
    if (gesture === 'pan') orbit._panOffset.x += delta;
    else orbit._sphericalDelta.theta += delta;
  };
  const position = () => gesture === 'pan' ? controls.target.x : controls.getAzimuthalAngle();
  let now = 100;
  const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
  const drag = bindDirectDrag(controls, 0.05);
  const frame = () => { now += 16; controls.dampingFactor = 0.05; drag.frame(now); controls.update(); };
  const press = () => { orbit.state = gesture === 'pan' ? 2 : 0; controls.dispatchEvent({ type: 'start' }); };
  const lift = () => { controls.dispatchEvent({ type: 'end' }); orbit.state = -1; };
  try {
    press();
    input(0.05);
    frame();
    expect(position()).toBeCloseTo(0.05, 9);
    input(-0.10);
    lift();
    expect(position()).toBeCloseTo(-0.05, 9);
    frame();
    const coasting = position();
    expect(coasting).toBeLessThan(-0.05);
    press();
    frame();
    expect(position()).toBeCloseTo(coasting, 9);
    input(-0.03);
    frame();
    expect(position()).toBeCloseTo(coasting - 0.03, 9);
    for (let i = 0; i < 8; i++) frame();
    lift();
    frame();
    expect(position()).toBeCloseTo(coasting - 0.03, 9);
    // An entire new gesture can also fit between two render frames.
    press();
    input(0.01);
    lift();
    expect(position()).toBeCloseTo(coasting - 0.02, 9);
  } finally {
    drag.dispose();
    clock.mockRestore();
  }
});
