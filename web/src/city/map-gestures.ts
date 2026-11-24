/**
 * Maps-style camera input for City (A2c), like Apple and Google Maps:
 *   mouse: drag pans, right-drag or Ctrl-drag rotates and tilts, scroll zooms toward the cursor,
 *          double-click zooms in
 *   touch: one finger pans, pinch zooms, two fingers dragged up or down tilt, twisting two
 *          fingers rotates, double-tap zooms in
 * OrbitControls does the panning, pinching and tilting; this adds the twist and the double
 * click/tap. A trackpad orbit and a two-finger twist keep the current Follow target.
 */
import { MOUSE, TOUCH } from 'three';
import { wheelShare } from './camera-damping';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/** Wheel delta for one double-click zoom step: OrbitControls scales by 0.95^(|Δ|/100), ≈ ½ here. */
const DOUBLE_ZOOM_DELTA = -1350;
const TAP_MS = 300;
/** Mouse-wheel zoom easing time constant (?camera=direct): ~95% of a notch lands in 120 ms. */
const WHEEL_EASE_MS = 40;
const TAP_PX = 24;

/** Signed smallest angle from a to b, in radians. */
export const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function mapGestures(
  controls: OrbitControls,
  el: HTMLElement,
  /** Turn the view by degrees, as City's rotate() does (positive turns the bearing down). */
  rotate: (degrees: number) => void,
  onZoom: () => void,
  o: { legacy?: boolean; easeWheel?: boolean } = {},
) {
  // Ctrl/⌘/Shift + left rotates (OrbitControls' own PAN modifier path). Middle rotates too: three
  // r180's middle-drag dolly reads the cursor's y from its x, which zoomToCursor would expose.
  controls.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.ROTATE, RIGHT: MOUSE.ROTATE };
  controls.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };
  controls.zoomToCursor = true;
  // zoomToCursor moves only the camera when the view ray is within 20° of the horizon; keep the
  // tilt clear of that so zooming never swings the view.
  controls.maxPolarAngle = Math.min(controls.maxPolarAngle, (70 * Math.PI) / 180);

  const touches = new Map<number, { x: number; y: number }>();
  // Two fingers: their midpoint moving up or down tilts (OrbitControls), the twist turns (below).
  // Sideways midpoint motion must not turn the map as well, so drop OrbitControls' azimuth share
  // while two touches are down. `_rotateLeft` is OrbitControls' private API (three 0.180).
  const inner = controls as unknown as { _rotateLeft?: (angle: number) => void };
  const rotateLeft = inner._rotateLeft?.bind(controls);
  if (rotateLeft) inner._rotateLeft = (angle: number) => { if (touches.size < 2) rotateLeft(angle); };

  const events = new AbortController();
  const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void) =>
    el.addEventListener(type, fn as EventListener, { signal: events.signal, passive: true });

  // Classify once for each wheel burst. Pinch (ctrl-wheel) and notched mouse wheels
  // retain OrbitControls' zoom-to-cursor behaviour.
  let lastWheel = -Infinity;
  let wheelPending = 0;
  let wheelAt = { x: 0, y: 0 };
  let trackpad = false;
  el.addEventListener('wheel', e => {
    // Our own synthetic wheels (double-click zoom, eased steps) go straight to OrbitControls and
    // must not reclassify the device.
    if (!e.isTrusted) return;
    if (e.timeStamp - lastWheel > 140) {
      const wheelNotch = Math.abs(e.deltaY) / 4.000244140625; // MapLibre's macOS wheel increment
      const notched = wheelNotch > 0 && Math.abs(wheelNotch - Math.round(wheelNotch)) < 1e-6;
      trackpad = !notched && e.deltaMode === 0 && (e.deltaX !== 0 || Math.abs(e.deltaY) < 40 || !Number.isInteger(e.deltaY));
    }
    lastWheel = e.timeStamp;
    // ?camera=direct: a notched mouse wheel's step eases in over ~120 ms (tick, below) instead of
    // jumping in one frame. Split deltas multiply to the same zoom, at the same cursor.
    if (o.easeWheel && !trackpad && !e.ctrlKey && e.deltaY) {
      e.stopImmediatePropagation();
      e.preventDefault();
      onZoom();
      wheelPending += e.deltaY;
      wheelAt = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!trackpad || e.ctrlKey) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    const orbit = controls as unknown as { _rotateUp(value: number): void };
    orbit._rotateUp(e.deltaY * 0.004);
    rotate(e.deltaX * 0.15);
    // The frame loop applies it; updating here too ran extra damping steps per wheel event, so the
    // smoothing depended on how often the trackpad reports. `?camera=legacy` keeps that.
    if (o.legacy) controls.update();
  }, { capture: true, passive: false, signal: events.signal });

  // Through OrbitControls' wheel path, so the zoom keeps the point under the cursor. Deferred:
  // OrbitControls ends its own touch state in a pointerup listener that runs after ours, and it
  // ignores the wheel until then.
  const zoomAt = (x: number, y: number) => {
    onZoom();
    setTimeout(() => el.dispatchEvent(new WheelEvent('wheel', { deltaY: DOUBLE_ZOOM_DELTA, clientX: x, clientY: y, bubbles: true, cancelable: true })));
  };
  let lastTouch = -Infinity;
  // Touch browsers can also send dblclick after a double tap; the tap detector below owns that.
  on('dblclick', (e) => { if (e.timeStamp - lastTouch > 800) zoomAt(e.clientX, e.clientY); });

  // ---- twist: the change in the angle between two touches turns the view ----
  let twist: number | null = null;
  const angle = () => {
    const [a, b] = [...touches.values()];
    return Math.atan2(b.y - a.y, b.x - a.x);
  };
  // A two-finger tilt can report its pointers on different frames, briefly
  // spreading them like a pinch. Classify zoom by net span at the first lift.
  let pinchStart: number | null = null;
  const span = () => {
    const [a, b] = [...touches.values()];
    return Math.hypot(b.x - a.x, b.y - a.y);
  };
  // ---- double tap: two quick single-finger taps close together ----
  let down: { id: number; x: number; y: number; t: number } | null = null;
  let lastTap: { x: number; y: number; t: number } | null = null;

  on('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    lastTouch = e.timeStamp;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size > 1) lastTap = null; // a pinch between two taps is not a double tap
    twist = touches.size === 2 ? angle() : null;
    pinchStart = touches.size === 2 ? span() : null;
    down = touches.size === 1 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
  });
  on('pointermove', (e) => {
    const p = touches.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (touches.size !== 2 || twist == null) return;
    const a = angle();
    const d = angleDelta(twist, a);
    twist = a;
    // Fingers turning clockwise on screen turn the map with them, so the bearing goes down.
    if (Math.abs(d) > 1e-4 && Math.abs(d) < 0.5) rotate((d * 180) / Math.PI);
  });
  const lift = (e: PointerEvent) => {
    if (!touches.has(e.pointerId)) return;
    if (e.type === 'pointerup' && pinchStart !== null) {
      // Include the lifted finger's final coordinate, even on a quick pinch.
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (Math.abs(span() - pinchStart) > 6) onZoom();
    }
    touches.delete(e.pointerId);
    pinchStart = touches.size === 2 ? span() : null;
    twist = touches.size === 2 ? angle() : null;
    if (e.type !== 'pointerup' || !down || down.id !== e.pointerId) return (down = null), undefined;
    const quick = e.timeStamp - down.t < TAP_MS && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10;
    down = null;
    if (!quick) return void (lastTap = null);
    if (lastTap && e.timeStamp - lastTap.t < TAP_MS * 1.2 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < TAP_PX) {
      lastTap = null;
      zoomAt(e.clientX, e.clientY);
    } else lastTap = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  };
  on('pointerup', lift);
  on('pointercancel', lift);

  const stop = () => {
    events.abort();
    if (rotateLeft) inner._rotateLeft = rotateLeft;
  };
  /** Each frame (City's loop): feed the eased share of pending wheel zoom to OrbitControls. */
  const tick = (frameMs: number) => {
    if (!wheelPending) return;
    const share = wheelShare(frameMs, WHEEL_EASE_MS);
    let d = wheelPending * share;
    if (Math.abs(wheelPending - d) < 0.5) d = wheelPending;
    wheelPending -= d;
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: d, clientX: wheelAt.x, clientY: wheelAt.y, bubbles: true, cancelable: true }));
  };
  return Object.assign(stop, { tick });
}
