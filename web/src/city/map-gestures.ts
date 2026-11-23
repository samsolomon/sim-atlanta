/**
 * Maps-style camera input for City (A2c, behind ?ui=next), like Apple and Google Maps:
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
  controls.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }; // Ctrl/⌘/Shift + left rotates
  controls.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };
  controls.zoomToCursor = true;

  const events = new AbortController();
  const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void) =>
    el.addEventListener(type, fn as EventListener, { signal: events.signal, passive: true });

  const zoomAt = (x: number, y: number) => {
    onGesture();
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: DOUBLE_ZOOM_DELTA, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  };
  on('dblclick', (e) => zoomAt(e.clientX, e.clientY));

  // ---- twist: the change in the angle between two touches turns the view ----
  const touches = new Map<number, { x: number; y: number }>();
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
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
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

  return () => events.abort();
}
