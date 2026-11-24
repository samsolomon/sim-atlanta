/**
 * Glass over City (docs/ui-controls-brief.md, "Glass over City: performance budget").
 *
 * CSS `backdrop-filter` over the City canvas makes the browser composite the canvas through an
 * extra full-screen pass every frame instead of presenting it directly. That costs about 15 fps on
 * an M5 Air and 4 on a Galaxy A16. This module owns the switch that takes the filter off:
 *
 * - 'css': the browser blurs. 2D Map, Models, and City on High (until City draws its own glass).
 * - 'flat': the low-tier fallback. No blur anywhere; the panels' tint fill gets denser, so text
 *   still reads over busy roofs.
 */
export type GlassMode = 'css' | 'flat';

let mode: GlassMode = 'css';

export function setGlassMode(next: GlassMode) {
  if (next === mode) return;
  mode = next;
  document.documentElement.classList.toggle('glass-flat', next === 'flat');
}

export function glassMode(): GlassMode {
  return mode;
}
