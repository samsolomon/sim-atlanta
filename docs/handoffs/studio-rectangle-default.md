# Handoff: studio-rectangle-default (release packager + Follow)

Claude (Opus 5.5), session `orca_session_id:f4705eb0-457d-47df-aca6-992847d53ceb`, handing to Codex on 2026-11-23.

## State

- No open PRs or uncommitted work of mine. The worktree is clean on `main`. My merged work: #175 and #180 (west-edge shadows and the perimeter test), #238 (Follow any vehicle), #261 (timetable→live handoff).
- **Releases packaged, newest first** (all Taildropped to `sams-macbook-air`; the coordinator deploys):
  - `bc32b09`, the phones release: `e3a3239c…315e`. No data change.
  - `94e2d8e`, A2c default: `b630dabb…b79e`. Changed `downtown/vignette.json` (#215).
  - `d1866d5`: a held candidate, superseded.
  - Earlier: `fd2ccc7`, `82a0d5f`, `22b175d`.
  - Archives are in `~/Developer/sim-atlanta-release-<sha>/`. Diff the next release's `web/dist/data` against the newest one the coordinator says is live.
- **Not mine but in flight:** #310 removes `?ui=classic` and is meant for the *next* release. #326 (perf budgets) and #291 (freight locomotive) belong to other agents.

## Sam's decisions (2026-11-23)

- Follow is on by default (`?follow=0` turns it off).
- "Underground" comes only from mapped data:
  - OSM `tunnel=yes` North Line ways (`fixtures/midtown-tunnel.json`);
  - downtown cover from #281;
  - baked rail spans, which decide wherever they exist.
- The tier chip on a follow status is the *position's* tier. A timetable→live handoff is labelled **Inferred**, because MARTA's live feed has no trip ids.
- #231: tiers appear only on selected cards and in the scene-wide Live/Timetable word, never as ambient notes.
- Review screenshots are captioned BEFORE/AFTER composites, with the money shot first. Merge notices link to the images in `docs/log` on GitHub.
- A2c is the interface. `?ui=classic` lasts one release (gone with #310).

## Next steps

1. **Follow PR B: the two illustrative freights.** City freight (`city/freight.ts`) and the Brookwood Norcross freight (`brookwood.ts`). Each needs a stable consist id and per-car `userData.trainId` / `lengthM` (local +z along the track).
   - Add a `freight` branch to `locate()` in `city.ts`.
   - The card must stay `illustrative`.
   - `pick.ts` currently returns `{kind:'freight'}` with no id.
2. **Package releases** when the coordinator asks. The recipe:
   - On `main`, run `pnpm data:city` (it includes `data:midtown`) if any PR needs data, then `pnpm build`.
   - Run `pnpm test:release`.
   - `cmp` every `web/dist` non-asset file against the last live release.
   - Copy the previous release's `worker/` and `smoke/verify-production.py`.
   - Write `RELEASE.md`: highlights, a data table, about 20 day/night cameras, and smoke results.
   - Generate `SHA256SUMS`, tar with `COPYFILE_DISABLE=1`, and verify after extracting.
   - `tailscale file cp … sams-macbook-air:`, then send the SHA-256.
3. **Night live checks of Follow** have never been done (daytime only).

## Promises to other agents

- studio-ui-a2c (`d577649d-8640-473a-8c9b-461abf2b616a`): user gestures go through `manualCamera()`, which cancels Follow. `#train-follow`, `[data-follow]`, `[data-recenter]`, `.follow-status` and `showCard(html, canFollow)` stay stable.
- studio-midtown-marta (`84ff6fd9-a68e-4888-aa2a-4477f88e5ff0`): streetcar cars join Follow through `locate()`'s car list. Done in #278; nothing owed.
- studio-midtown-connector (`86c22ca9-ab18-4b2b-ae71-9fa693233f45`) owns `downtownCoverAt` in `vehicle-follow.ts` (#281).

## Servers and ports

None are running.
- When used: Vite on `127.0.0.1:5418`, release dist on `:5420` (`python3 -m http.server`), and a live-API forwarder on `:8787`.
- The forwarder (`scratchpad/liveproxy.mjs`) relays `/api/marta/{rail,bus}` to production's public cached endpoint when 1Password isn't unlocked for `pnpm secrets:local`.
- Background jobs are killed when their time limit runs out. Pass a long timeout, or the server silently disappears.

## Rules that bit me

- `cargo` isn't on PATH on the Studio. Run `PATH="$(brew --prefix rustup)/bin:$PATH"`.
- `pnpm test:release` needs a per-worktree `.venv` with shapely. Delete `pipeline/scripts/__pycache__` afterwards; it isn't gitignored.
- Orca's `set device` doesn't resize the tab. For phone captures, use headless Chrome over CDP: `Emulation.setDeviceMetricsOverride`, plus a UA override and touch emulation so the device tier picks Low.
- Never `git reset --soft origin/main` to squash after `origin/main` has moved. It folds other PRs' reversions into your commit. Rebase instead.
- `docs/build-log.md` conflicts on almost every rebase, because everyone appends. Keep both sides.
- `main` moves every few minutes, so rebase right before `gh pr merge`.
- Pipe CDP script output through `grep -v`, not `head`. `head` closes the pipe and leaves headless Chrome running.
- Under load (load average around 15), a few vitest files can time out. Rerun before calling it a regression.
- Release-note claims need checking against the code. #317's ashlar wasn't wired into any house, and the lab model keys differ from their display names.
