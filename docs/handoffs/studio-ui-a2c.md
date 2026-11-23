# Handoff: studio-ui-a2c (A2c interface)

Written 2026-11-23 by the Claude session d577649d-8640-473a-8c9b-461abf2b616a, for its Codex successor.

## State
- The A2c UI (docs/ui-controls-brief.md, steps 1–9) is built, the default interface, and **live in production at 94e2d8e**.
- Merged after that deploy (each needs only a web rebuild):
  - #305: Follow and Share pinned on short viewports.
  - #309: City's "Show full board" retry as a menu row. It had been unreachable since step 6; production lacks this fix.
  - #321: Graphics Auto steps down to Low for the session when City runs under 20 fps at High.
- **Open: draft #310** (`samsolomon/ui-remove-classic`). It removes the old shell, `?ui=classic`, `?controls=1` and the City info popover (−770 lines). Tests pass. Merge it for the release *after* 94e2d8e, when the coordinator says. Keep `<div id="city-info" hidden>`: City's retry button and `tests/board-exterior` need it.
- Code map:
  - `web/src/ui/next/`: shell.ts, panel.ts, models-view.ts, radio.ts, next.css.
  - `web/src/ui/status.ts`: tier words, tested.
  - `web/src/ui/share.ts`.
  - `web/src/city/map-gestures.ts`, `web/src/city/white-model.ts`.
  - Map↔City choreography: `openCity`, `leaveCityToMap` and `tiltMapTo` in `web/src/main.ts`.

## Sam's decisions (all 2026-11-23)
- A2c approved, then made the **default**, with `?ui=classic` kept for one release only.
- **#231 tier rule:** the corner shows only Live or Timetable. Chips go on selected-vehicle cards. Ambient scenery carries no on-screen tier.
- 2D Map keeps a **permanent** credit line; City's credit fades after the first move or 5 s.
- Phones use the short tier line ("● Live").
- Loading is the **white model**. Map→City is **option B**: the map tilts at City's 22° field of view, white buildings stand on its streets, then colour cross-fades in. No zoom.
- The white fade is 1.2 s ease-in-out.
- The radio stays a stub until real tracks exist, and says "no audio yet".
- Do not change progressive versus eager area loading until A16 data exists.

## Next steps
1. Merge #310 when the coordinator cuts the next release.
2. Still deferred from the brief:
   - Render the white model before the build stages finish (needs A16 numbers; the desktop build is 0.59 s).
   - White areas that arrive later.
   - Carry the weather choice in frozen share links.
3. After #310, drop the non-A2c layouts in `map/card.ts` (the `a2c` parameter).

## Promises to other agents
- **phone-perf** (3126b1a7-8882-498c-a5ff-7b65d626cf91): #312 (device-tier rules) changes `pickQuality()`. It needs no UI change, but they will ping if its rules change. The Auto step-down contract is in #321.
- **Lab owners** (tree-species 6b76e039…, tree-lab 4a8d1cca…, Amtrak e5348118…, parks eee32d1c…, materials 2a079a0f…):
  - Lab markup lives in `web/src/models/lab-markup.ts`, and lab CSS is scoped under `.lab`.
  - The Models view reads `.model-group button[data-model]` and moves `.settings` into its Details panel.
  - Keep `__lab.render()`/`resize()` working.
- **ground-contact** (1df827bc…) and **materials**: the white model swaps one material per mesh for a few frames and uses one temporary render target, declared in `materials/budget.ts`.

## Servers
None running. I stopped the device preview on :5741 (it was serving 94e2d8e) and my dev server on :5730. The shared worker on :8787 belonged to someone else and was already down.

## Rules that bit
- **Squashing onto a moved main reverts other agents' work** (it nearly reverted #232). Rebase, or rebuild the branch from a patch of only your files.
- **`docs/build-log.md` conflicts on almost every rebase.** Keep both sides.
- **Orca browser background tab:**
  - It draws about 1 frame a second. Pump frames with `orca screenshot`.
  - Viewports taller than about 776 px duplicate a strip in captures.
  - `goto` resets the viewport to 999×496.
- **Cargo:** needs `export PATH="$(dirname $(ls ~/.rustup/toolchains/*/bin/cargo | head -1)):$PATH"` before `pnpm test`.
- **`square-board/sections.test.ts`** occasionally times out under load. Rerun it.
- **Texture budget:** a new render target or texture must be declared in `web/src/materials/budget.ts`.
- **Reviews:** Codex and Grok were unavailable to Claude, so every PR used the code-review skill as self-review.
