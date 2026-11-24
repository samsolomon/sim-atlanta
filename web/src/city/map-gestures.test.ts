import { describe, expect, it, vi } from 'vitest';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { angleDelta, mapGestures } from './map-gestures';

describe('twist angle', () => {
  it('takes the short way round', () => {
    expect(angleDelta(0.1, 0.3)).toBeCloseTo(0.2);
    expect(angleDelta(Math.PI - 0.05, -Math.PI + 0.05)).toBeCloseTo(0.1);
    expect(angleDelta(-Math.PI + 0.05, Math.PI - 0.05)).toBeCloseTo(-0.1);
  });
});

describe('two-finger zoom intent', () => {
  it.each([
    { gesture: 'staggered tilt', first: 390, second: 480, lift: 390, zooms: 0 },
    { gesture: 'anchored pinch', first: 400, second: 515, lift: 400, zooms: 1 },
    { gesture: 'quick pinch ending at lift', first: 397, second: 493, lift: 385, zooms: 1 },
  ])('classifies $gesture when the first finger lifts', ({ first, second, lift, zooms }) => {
    const el = new EventTarget() as HTMLElement;
    const zoom = vi.fn();
    const controls = { maxPolarAngle: Math.PI } as OrbitControls;
    const dispose = mapGestures(controls, el, () => {}, zoom);
    const send = (type: string, id: number, y: number) => el.dispatchEvent(Object.assign(new Event(type), {
      pointerType: 'touch', pointerId: id, clientX: 365, clientY: y,
    }));
    send('pointerdown', 1, 400);
    send('pointerdown', 2, 490);
    send('pointermove', 1, first);
    send('pointermove', 2, second);
    expect(zoom).not.toHaveBeenCalled();
    send('pointerup', 1, lift);
    send('pointerup', 2, second);
    expect(zoom).toHaveBeenCalledTimes(zooms);
    dispose();
  });
});
