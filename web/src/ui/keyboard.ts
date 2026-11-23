/**
 * Keyboard camera movement shared by both shells: WASD / arrows pan, Q/E rotate, +/− zoom,
 * M / C switch views and (optionally) N faces north. City also calls `advanceMovement` before
 * drawing, so a held key moves the camera once per frame whichever callback runs first.
 */
export interface KeyboardOptions {
  /** Move by a screen offset in CSS px (content moves opposite to the camera). */
  pan(dxPx: number, dyPx: number): void;
  zoom(dir: 1 | -1): void;
  rotate?(degrees: number): void;
  north?(): void;
  view(v: 'map' | 'city'): void;
  /** Escape: return true when the shell consumed it (closed something). */
  escape(): boolean;
  /** True while a modal surface owns the keyboard. */
  blocked(): boolean;
}

export const typing = (t: EventTarget | null) =>
  t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || (t instanceof HTMLElement && t.isContentEditable);

export function createKeyboard(o: KeyboardOptions) {
  const held = new Set<string>();
  const MOVE: Record<string, [number, number]> = {
    w: [0, 1], arrowup: [0, 1], s: [0, -1], arrowdown: [0, -1],
    a: [1, 0], arrowleft: [1, 0], d: [-1, 0], arrowright: [-1, 0],
  };
  let raf = 0;
  let lastT = 0;
  const advanceMovement = (t: number) => {
    if (!held.size || t <= lastT) return;
    const dt = Math.min(50, t - lastT);
    lastT = t;
    let dx = 0;
    let dy = 0;
    const turn = Number(held.has('e')) - Number(held.has('q'));
    for (const k of held) {
      const m = MOVE[k];
      if (m) {
        dx += m[0];
        dy += m[1];
      }
    }
    const v = 0.6 * dt; // ~600 px/s
    if (dx || dy) o.pan(dx * v, dy * v);
    if (turn) o.rotate?.(turn * 0.06 * dt); // 60°/s, independent of OS key repeat
  };
  const step = (t: number) => {
    advanceMovement(t);
    raf = held.size ? requestAnimationFrame(step) : 0;
  };
  // Escape closes only the topmost surface: a consumed Escape stops before the page's own
  // listeners (which close the detail card) see it.
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && o.escape()) e.stopImmediatePropagation();
  }, true);
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return;
    if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey || o.blocked()) return;
    const k = e.key.toLowerCase();
    if (MOVE[k] || ((k === 'q' || k === 'e') && o.rotate)) {
      // Arrow keys on a focused control (a segmented view switch, say) still move the camera;
      // there are no arrow-key widgets in the chrome.
      e.preventDefault();
      const fresh = !held.has(k);
      if (!held.size) lastT = performance.now();
      held.add(k);
      // A short tap can end before the next animation frame, especially on a busy scene.
      if (fresh) {
        if (MOVE[k]) o.pan(MOVE[k][0] * 9.6, MOVE[k][1] * 9.6);
        else o.rotate?.(k === 'q' ? -1 : 1);
      }
      if (!raf) raf = requestAnimationFrame(step);
    } else if (k === '+' || k === '=') o.zoom(1);
    else if (k === '-' || k === '_') o.zoom(-1);
    else if (k === 'm') o.view('map');
    else if (k === 'c') o.view('city');
    else if (k === 'n' && o.north) o.north();
  });
  addEventListener('keyup', (e) => held.delete(e.key.toLowerCase()));
  addEventListener('blur', () => held.clear());
  return { advanceMovement };
}
