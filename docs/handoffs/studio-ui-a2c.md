# Handoff: studio-ui-a2c (A2c interface)

Updated 2026-11-23 by Codex session 9c768eab-3e1a-4134-a130-ba680f7c212a for the gpt-6.2 successor. Original Claude: d577649d-8640-473a-8c9b-461abf2b616a.

Successor update from session `8b0f0ebc-f4fb-40d7-acbe-435e5c986ca1`: GitHub reports #310 as `OPEN`, draft, `mergeCommit: null`, and `mergeable: CONFLICTING` at `dd2d7594`. The release hold remains in effect. This session made no implementation changes and started no servers or browser tabs. The coordinator is assigning the Final layout rework to a 6.2 Astra successor in this worktree. Use a separate branch and PR for that rework. The latest working coordinator reply route is message `msg_0939307cbb03` with your own session ID.

## State
- A2c is the default interface. Sam confirmed **bc32b09 shipped with classic retained**. This supersedes the original handoff's release timing.
- **Open draft #310**, branch `samsolomon/ui-remove-classic`, code head `6d17519c` before this handoff commit. Verified OPEN, draft, mergeCommit null. **NEXT release only: do not merge until the coordinator explicitly authorizes it. Only the coordinator deploys.**
- Cleanup removes the old shell, `?ui=classic`, `?controls=1`, and City info popover. Keep `<div id="city-info" hidden>` for the full-board button and board-exterior tests. Fixed the leftover `hidePopover()` call in `city.ts`: optional chaining still invoked the method on the plain div and threw.
- Rebased onto `d1411a9e`; build-log conflicts preserved both entries. No uncommitted implementation work.
- Validation: tests/build passed on `64bc952c` and again on `8c281730` (912 web passed / 1 skipped, 5 worker, 20 Rust; pipeline skipped without `.venv`). Last rebase to `d1411a9e` brought an unrelated Woodruff landmark change and was **not retested**. Before merge, update to current main and rerun required checks, especially after build-log conflicts.
- Performance on earlier base passed enforced ceilings: Low 2.324M triangles / 530 calls; High 13.266M / 1,130 calls. Several aspirational targets remain unmet. No ceiling lowered: this cleanup did not deliver a rendering reduction.
- Two Claude rounds via `pnpm review -- --reviewer claude`: one confirmed popover bug fixed and committed; CSS visual concern dismissed by day/night browser checks. No blocking/significant findings. Review limit reached for this change.
- Browser checked Map, City, Models, old classic URL, full-board action, day/night selected cards and 390×640 phone. Screenshots: `docs/log/ui/remove-classic/{day-card,night-card,phone-night-card}.png`. Day camera `1799.793,-5699.709,-101,55,421`, 2026-11-20 14:00 ET, Low. Night 22:00 same date. Live API not checked (worker absent). PR body records evidence and limits. Requires web rebuild/redeploy only, no data rebuild.
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
1. Hold #310 for coordinator authorization for the release after bc32b09. Once authorized, update/test, merge, then verify `gh pr view 310 --json state,mergeCommit` before announcing MERGED; quote both returned values.
2. Still deferred from the brief:
   - Render the white model before the build stages finish (needs A16 numbers; the desktop build is 0.59 s).
   - White areas that arrive later.
   - Carry the weather choice in frozen share links.
3. After #310, drop the non-A2c layouts in `map/card.ts` (the `a2c` parameter).

## Coordination and promises
- Coordinator: Air terminal `term_05a952fa-de06-4064-8655-3e98e1caf1e0`. Direct `send --on air` rejects the saved pairing token. **Reply route works**: `/Applications/Orca.app/Contents/Resources/bin/orca orchestration reply --id msg_8a926fd79744 --from <your orca_session_id> --body '...'`. Coordinator received takeover status via this route. Use `orca orchestration check` for replies.
- Current handoff request is `msg_9d6ba3a61b13`; predecessor will reply READY FOR 6.2 after pushing this doc, then take no new work.
- Owe coordinator the eventual verified merge notice, screenshot links/camera, and any items requiring Sam's eye. No new promises made during Codex takeover. Contracts below are inherited; recheck their PR status before acting.
- **phone-perf** (3126b1a7-8882-498c-a5ff-7b65d626cf91): #312 (device-tier rules) changes `pickQuality()`. It needs no UI change, but they will ping if its rules change. The Auto step-down contract is in #321.
- **Lab owners** (tree-species 6b76e039…, tree-lab 4a8d1cca…, Amtrak e5348118…, parks eee32d1c…, materials 2a079a0f…):
  - Lab markup lives in `web/src/models/lab-markup.ts`, and lab CSS is scoped under `.lab`.
  - The Models view reads `.model-group button[data-model]` and moves `.settings` into its Details panel.
  - Keep `__lab.render()`/`resize()` working.
- **ground-contact** (1df827bc…) and **materials**: the white model swaps one material per mesh for a few frames and uses one temporary render target, declared in `materials/budget.ts`.

## Servers
None owned by this session remain. Codex dev server used :5173 (the `pnpm dev -- --port 5730` forwarding did not set Vite's port) and was stopped; review tab 56bcc186-04c8-4a6f-bee4-f94c9785c607 was closed. Predecessor stopped :5730 and :5741. Do not stop other agents' servers or the shared worker.

## Rules that bit
- **Squashing onto a moved main reverts other agents' work** (it nearly reverted #232). Rebase, or rebuild the branch from a patch of only your files.
- **`docs/build-log.md` conflicts on almost every rebase.** Keep both sides and rerun tests. Main moved repeatedly during preparation; never announce a merge from a command attempt alone.
- **Orca browser background tab:**
  - It draws about 1 frame a second. Pump frames with `orca screenshot`.
  - Viewports taller than about 776 px duplicate a strip in captures.
  - `goto` resets the viewport to 999×496.
- **Cargo:** needs `export PATH="$(dirname $(ls ~/.rustup/toolchains/*/bin/cargo | head -1)):$PATH"` before `pnpm test`.
- **`square-board/sections.test.ts`** occasionally times out under load. Rerun it.
- **Texture budget:** a new render target or texture must be declared in `web/src/materials/budget.ts`.
- **Reviews:** predecessor used self-review when other models were unavailable; Codex successfully ran two fresh Claude reviews for #310.
