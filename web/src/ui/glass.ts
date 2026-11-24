/**
 * Glass over City (docs/ui-controls-brief.md, "Glass over City: performance budget").
 *
 * CSS `backdrop-filter` over the City canvas makes the browser composite the canvas through an
 * extra full-screen pass every frame instead of presenting it directly. That costs about 15 fps on
 * an M5 Air and 4 to 6 on a Galaxy A16. So over City the blur moves out of CSS:
 *
 * - 'canvas' (High): City's final pass draws each panel's blurred, saturated backing itself; the
 *   DOM panel keeps its tint fill, edge, highlight, shadow and content and drops the filter.
 *   The renderer reads the rects with `glassSource(canvas)` once per frame.
 * - 'flat' (Low): no blur anywhere; the tint fill gets denser instead.
 * - 'css': the browser blurs. 2D Map, Models, City loading, paused or lost.
 *
 * Two owners: main.ts sets the base ('flat' while City shows at Low, else 'css') and the renderer
 * says whether it is drawing backings. Flat wins; otherwise canvas when the renderer draws.
 */

export type GlassMode = 'css' | 'canvas' | 'flat';

export interface GlassSource {
  /** Stride {@link GLASS_STRIDE}: x, y, w, h (CSS px from the canvas's top-left, y down), radius
   * (CSS px, clamped to half the short side), corner mask (bits for the rounded corners: TL 1,
   * TR 2, BR 4, BL 8; 15 = all, 0 = square), alpha (effective opacity, 0..1).
   * The same array object every call. */
  readonly data: Float32Array;
  /** Rects in use. */
  readonly count: number;
  /** Bumped whenever the data changes, so a renderer can skip re-uploading uniforms. */
  readonly version: number;
}

export const GLASS_MAX = 24;
export const GLASS_STRIDE = 7;
/** Keep re-measuring every frame this long after the last transition or animation event. */
const SETTLE_MS = 700;

let base: 'css' | 'flat' = 'css';
let canvasDraws = false;
let mode: GlassMode = 'css';

/** The mode the two owners resolve to. Pure, for tests. */
export function resolveGlassMode(baseMode: 'css' | 'flat', rendererDraws: boolean): GlassMode {
  if (baseMode === 'flat') return 'flat';
  return rendererDraws ? 'canvas' : 'css';
}

function apply() {
  const next = resolveGlassMode(base, canvasDraws);
  if (next === mode) return;
  mode = next;
  const root = document.documentElement.classList;
  root.toggle('glass-canvas', next === 'canvas');
  root.toggle('glass-flat', next === 'flat');
  dirty = true;
}

/** main.ts: 'flat' while City shows at Low, otherwise 'css'. */
export function setGlassMode(next: 'css' | 'flat') {
  base = next;
  apply();
}

/** The renderer: true after the first frame that drew the backings, false when it stops drawing
 * them (pause, dispose, context loss). */
export function setCanvasGlass(draws: boolean) {
  canvasDraws = draws;
  apply();
}

export function glassMode(): GlassMode {
  return mode;
}

// ---- rects ------------------------------------------------------------------------------------

const data = new Float32Array(GLASS_MAX * GLASS_STRIDE);
const source = { data, count: 0, version: 0 };
let dirty = true;
let liveUntil = 0;
let watching = false;
let nodes: HTMLElement[] | null = null;
let measures = 0;

/** One rect's radius and corner mask from its four computed corner radii (CSS strings such as
 * '16px' or '50%'). Pure, for tests. */
export function cornerShape(corners: readonly string[], w: number, h: number): { radius: number; mask: number } {
  const px = corners.map((v) => {
    const n = parseFloat(v) || 0;
    return v.trim().endsWith('%') ? (n / 100) * Math.min(w, h) : n;
  });
  const radius = Math.min(Math.max(0, ...px), w / 2, h / 2);
  const mask = px.reduce((m, v, i) => (v > 0.5 ? m | (1 << i) : m), 0);
  return { radius, mask };
}

/** Glass surfaces: `.a2-g` elements that hold no other glass (the camera group is a wrapper
 * around its glass pieces), unless a rule opts one out with `--a2-glass: 0`. */
function glassNodes(): HTMLElement[] {
  if (!nodes) nodes = [...document.querySelectorAll<HTMLElement>('.a2-g')].filter((el) => !el.querySelector('.a2-g'));
  return nodes;
}

/** An inline-style change matters only on a glass panel or something around one, never inside one:
 * the compass needle turns by its own style every frame of a camera turn. */
function movesGlass(target: Node): boolean {
  return target instanceof Element && (target.classList.contains('a2-g') || !!target.querySelector('.a2-g'));
}

function markLive() {
  dirty = true;
  liveUntil = performance.now() + SETTLE_MS;
}

function watch() {
  if (watching) return;
  watching = true;
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'childList') {
        nodes = null;
        dirty = true;
      } else if (r.attributeName !== 'style' || movesGlass(r.target)) dirty = true;
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'style', 'open'] });
  for (const type of ['transitionrun', 'transitionend', 'transitioncancel', 'animationstart', 'animationend', 'animationcancel'])
    document.addEventListener(type, markLive, true);
  // Sheet drags move panels on pointermove; a panel scrolled inside doesn't move.
  document.addEventListener('pointermove', (e) => { if (e.buttons) markLive(); }, { passive: true, capture: true });
  addEventListener('resize', markLive, { passive: true });
}

function effectiveOpacity(el: HTMLElement): number {
  let a = 1;
  for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (s.display === 'none' || s.visibility === 'hidden') return 0;
    a *= Number(s.opacity);
    if (a <= 0) return 0;
  }
  return a;
}

function refresh(canvas: Element) {
  measures++;
  const c = canvas.getBoundingClientRect();
  let n = 0;
  let changed = false;
  const put = (i: number, v: number) => {
    if (data[i] !== v) {
      data[i] = v;
      changed = true;
    }
  };
  for (const el of glassNodes()) {
    if (n === GLASS_MAX) break;
    if (el.hidden || !el.isConnected) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.right <= c.left || r.left >= c.right || r.bottom <= c.top || r.top >= c.bottom) continue;
    const s = getComputedStyle(el);
    if (s.getPropertyValue('--a2-glass').trim() === '0') continue;
    const alpha = effectiveOpacity(el);
    if (alpha <= 0.002) continue;
    const { radius, mask } = cornerShape(
      [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius], r.width, r.height);
    const o = n * GLASS_STRIDE;
    put(o, r.left - c.left);
    put(o + 1, r.top - c.top);
    put(o + 2, r.width);
    put(o + 3, r.height);
    put(o + 4, radius);
    put(o + 5, mask);
    put(o + 6, alpha);
    n++;
  }
  if (n !== source.count) changed = true;
  source.count = n;
  if (changed) source.version++;
}

/** The live glass rects relative to `canvas`. Call once per frame, before the pass that draws
 * them. Measures only on frames where something changed; otherwise it returns the last result. */
export function glassSource(canvas: Element): GlassSource {
  watch();
  if (dirty || performance.now() < liveUntil) {
    dirty = false;
    refresh(canvas);
  }
  return source;
}

/** ?glassdebug (any build, so it works with ?perf on a device): outline every rect the renderer
 * would draw, and expose the measurement count, so mismatches show on the first integrated build. */
export function mountGlassDebug(canvas: Element) {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99';
  document.body.append(box);
  let shown = -1;
  const w = window as unknown as { __glassMeasures: () => number; __glassRects: () => number[][] };
  w.__glassMeasures = () => measures;
  w.__glassRects = () => Array.from({ length: source.count }, (_, i) => Array.from(data.subarray(i * GLASS_STRIDE, (i + 1) * GLASS_STRIDE)));
  const frame = () => {
    const before = source.version;
    const s = glassSource(canvas);
    if (s.version !== before || shown < 0) {
      const c = canvas.getBoundingClientRect();
      box.replaceChildren(...Array.from({ length: s.count }, (_, i) => {
        const o = i * GLASS_STRIDE;
        const d = document.createElement('div');
        const r = `${s.data[o + 4]}px`;
        const m = s.data[o + 5];
        d.style.cssText = `position:absolute;left:${c.left + s.data[o]}px;top:${c.top + s.data[o + 1]}px;width:${s.data[o + 2]}px;height:${s.data[o + 3]}px;outline:2px dashed #f0f;opacity:${s.data[o + 6]};border-radius:${m & 1 ? r : 0} ${m & 2 ? r : 0} ${m & 4 ? r : 0} ${m & 8 ? r : 0}`;
        return d;
      }));
      shown = s.version;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
