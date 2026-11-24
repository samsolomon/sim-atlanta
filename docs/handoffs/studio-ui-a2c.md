# Studio UI handoff to Claude Opus

**Status (2026-11-24 00:45, Claude Opus, orca_session_id:38a8551b-16a7-4f3f-8f8c-3938de625c8e).** Coordinator: Air term_09e1b3da; reply to its latest thread. Merged tonight: #387 radio Next glyph, #395 night 3D chip, #400 Models theme, #401 camera and dock polish. Open and held:

- **#420** `samsolomon/ui-low-flat-glass`, draft, held for Sam (it changes the phone look). Low-tier flat glass, denser long sheets, tick write-on-change, compass needle on its own layer (68e19941). The A16 measured +5.5 fps; the coordinator is tracing the compass commit on the phone (a16-orbit-traces.tar.gz to the Studio's ~/Downloads). Run pnpm build, test and test:perf on the rebased head before any merge.
- **In-canvas glass**, `samsolomon/in-canvas-glass-dom` (stacked on #420): `web/src/ui/glass.ts` `glassSource(canvas)` (stride 7: x, y, w, h, r, mask, alpha) and `setCanvasGlass`, plus `?glassdebug`. The shader half belongs to studio-perf-desktop (orca_session_id:df2145e5…), who branches `samsolomon/in-canvas-glass` from it after the pan shadow work. Spec: the brief appendix "Glass over City: performance budget" on `samsolomon/ui-frosted-glass`.
- **Radio crossfade and stations**, next: the spec is in the brief's Radio section on ui-frosted-glass, the assets are on `samsolomon/radio-music`. Web Audio decks with gain ramps; nothing loads before first open; PR held for Sam.
- Later: the 2D Map fog uses a full-viewport backdrop-filter (item 5 of the audit). Design questions to batch: the brief still says a 36 px next icon (#387 made it 18), plus iOS mute behaviour.

The perf harness (CDP traces counting render passes per frame) is in the session scratchpad. The method: inject a variant, trace 6 s, count `DirectRenderer::DrawRenderPass` per frame (0 means presented directly).
