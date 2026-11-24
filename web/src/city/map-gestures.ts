/**
 * Maps-style camera input for City (A2c), like Apple and Google Maps:
 *   mouse: drag pans, right-drag or Ctrl-drag rotates and tilts, scroll zooms toward the cursor,
 *          double-click zooms in
 *   touch: one finger pans, pinch zooms, two fingers dragged up or down tilt, twisting two
 *          fingers rotates, double-tap zooms in
 * OrbitControls does the panning, pinching and tilting; this adds the twist and the double
 * click/tap. Every gesture reports through `onGesture` (City's manualCamera), which ends Follow.
 */
import { MOUSE, TOUCH } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/** Wheel delta for one double-click zoom step: OrbitControls scales by 0.95^(|Δ|/100), ≈ ½ here. */
const DOUBLE_ZOOM_DELTA = -1350;
const TAP_MS = 300;
const TAP_PX = 24;

/** Signed smallest angle from a to b, in radians. */
export const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function mapGestures(
  controls: OrbitControls,
  el: HTMLElement,
  /** Turn the view by degrees, as City's rotate() does (positive turns the bearing down). */
  rotate: (degrees: number) => void,
  onGesture: () => void,
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

  // Through OrbitControls' wheel path, so the zoom keeps the point under the cursor. Deferred:
  // OrbitControls ends its own touch state in a pointerup listener that runs after ours, and it
  // ignores the wheel until then.
  const zoomAt = (x: number, y: number) => {
    onGesture();
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
  // ---- double tap: two quick single-finger taps close together ----
  let down: { id: number; x: number; y: number; t: number } | null = null;
  let lastTap: { x: number; y: number; t: number } | null = null;

  on('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    lastTouch = e.timeStamp;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size > 1) lastTap = null; // a pinch between two taps is not a double tap
    twist = touches.size === 2 ? angle() : null;
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
    if (!touches.delete(e.pointerId)) return;
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

  return () => {
    events.abort();
    if (rotateLeft) inner._rotateLeft = rotateLeft;
  };
}
