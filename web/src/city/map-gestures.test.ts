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

describe('direct wheel zoom', () => {
  it.each([
    { unit: 'pixels', deltaMode: 0, deltaY: 120, expected: 120 },
    { unit: 'lines', deltaMode: 1, deltaY: 3, expected: 48 },
    { unit: 'pages', deltaMode: 2, deltaY: -1, expected: -100 },
    { unit: 'pixels during a drag', deltaMode: 0, deltaY: 120, expected: 0, state: 2 },
    { unit: 'pixels with reduced motion', deltaMode: 0, deltaY: 120, expected: 0, reduced: true },
  ])('preserves the OrbitControls zoom for $unit across eased steps', ({ deltaMode, deltaY, expected, state = -1, reduced = false }) => {
    class TestWheelEvent extends Event {
      constructor(type: string, init: WheelEventInit) {
        super(type, init);
        const { deltaMode = 0, deltaY = 0, deltaX = 0, ctrlKey = false, clientX, clientY } = init;
        Object.assign(this, { deltaMode, deltaY, deltaX, ctrlKey, clientX, clientY });
      }
    }
    vi.stubGlobal('WheelEvent', TestWheelEvent);
    const el = new EventTarget() as HTMLElement;
    const controls = { maxPolarAngle: Math.PI, enabled: true, enableZoom: true, state };
    const zoom = vi.fn();
    const stop = mapGestures(controls as unknown as OrbitControls, el, () => {}, zoom, {
      easeWheel: true, motionPreference: { matches: reduced } as MediaQueryList,
    });
    const steps: number[] = [];
    el.addEventListener('wheel', e => { if (!e.isTrusted) steps.push(e.deltaY); });
    try {
      const input = new WheelEvent('wheel', { deltaMode, deltaY, clientX: 50, clientY: 40, cancelable: true });
      Object.defineProperty(input, 'isTrusted', { value: true });
      el.dispatchEvent(input);
      controls.state = -1; // Releasing the button must never replay a rejected notch.
      for (let i = 0; i < 60; i++) stop.tick(1000 / 60);
      if (expected === 0) {
        expect(input.defaultPrevented).toBe(false); // Native wheel rules own this event.
        expect(zoom).not.toHaveBeenCalled();
        expect(steps).toEqual([]);
        return;
      }
      expect(steps.length).toBeGreaterThan(1);
      expect(steps.reduce((sum, delta) => sum + delta, 0)).toBeCloseTo(expected, 9);
    } finally {
      stop();
      vi.unstubAllGlobals();
    }
  });
});
