# Handoff: studio-rectangle-default (release packager + Follow)

Codex session `orca_session_id:d460b6b8-d706-4545-8a60-370d9ba9369c`, handing to gpt-6.2 on 2026-11-23. Original Claude predecessor: `orca_session_id:f4705eb0-457d-47df-aca6-992847d53ceb`.

## State

- Follow PR B **#338 is merged**, verified using `gh pr view 338 --json state,mergeCommit`: `MERGED`, `f70efec304469f65d3d4f1b56d2404cf66137746`. No implementation remains in flight. This handoff is a pushed docs-only commit on `samsolomon/handoff-studio-rectangle-62`; it is not merged or a PR yet.
- #338 adds stable ids `illustrative:freight:downtown` and `illustrative:freight:norcross`, freight picking and Follow. Current-frame clip-tested cars drive the camera. Cards/status stay Illustrative; disappearance ends Follow without a tunnel claim. Norcross board exit reports “train left the board”.
- Validation after rebase: 20 Rust, 11 pipeline, 931 web (+1 skipped), 5 worker; build/typecheck and Low/High perf passed. Claude cross-review completed two rounds; only visual finding dismissed after replay checks.
- [Review sheet](../log/ui/follow/freight-review.jpg) compares BEFORE Follow / AFTER Follow / exit interaction states, not software versions. Four `*-check.json` files beside it record replay camera/status samples. Full-night freight checks passed; passenger live-feed night checks remain separate.
- Earlier merged work: #175/#180 shadows, #238 Follow, #261 timetable→live handoff. No release packaged by this Codex session.
- **Releases packaged, newest first** (all Taildropped to `sams-macbook-air`; the coordinator deploys):
  - `bc32b09`, the phones release: `e3a3239c…315e`. No data change.
  - `94e2d8e`, A2c default: `b630dabb…b79e`. Changed `downtown/vignette.json` (#215).
  - `d1866d5`: a held candidate, superseded.
  - Earlier: `fd2ccc7`, `82a0d5f`, `22b175d`.
  - Archives are in `~/Developer/sim-atlanta-release-<sha>/`. Diff the next release's `web/dist/data` against the newest one the coordinator says is live.
- The prior handoff listed #310, #326 and #291 as in flight. That list is historical; check current main and the coordinator’s release baseline before packaging.

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

1. Read this branch’s docs-only handoff commit and the predecessor conversation; do not redo #338. Finish the handoff docs PR if desired. The only known Follow follow-up is passenger **live-feed night checks** (unshifted present clock), which freight replay checks do not cover. Coordinate further scope with the coordinator.
2. **Package releases** when the coordinator asks. The recipe:
   - On `main`, run `pnpm data:city` (it includes `data:midtown`) if any PR needs data, then `pnpm build`.
   - Run `pnpm test:release`.
   - `cmp` every `web/dist` non-asset file against the last live release.
   - Copy the previous release's `worker/` and `smoke/verify-production.py`.
   - Write `RELEASE.md`: highlights, a data table, about 20 day/night cameras, and smoke results.
   - Generate `SHA256SUMS`, tar with `COPYFILE_DISABLE=1`, and verify after extracting.
   - `tailscale file cp … sams-macbook-air:`, then send the SHA-256.
3. Await coordinator release requests; only the coordinator deploys. No new release is currently requested.

## Coordinator route and evidence

- Coordinator: `term_05a952fa-de06-4064-8655-3e98e1caf1e0` on the Air. Direct `send --on air` fails with rejected pairing token. Reply on an incoming message instead, using your own session id. Known thread: `orca orchestration reply --id msg_3233869b9e9f --from <your orca_session_id> --body "..."`. Ask for a fresh inbound thread if required. `orca orchestration check` reads replies.
- Coordinator already received verified #338 merge, screenshots, cameras and validation. Nothing else is owed except availability for releases and preserving the UI contracts below.
- Screenshot cameras (use `?view=city&q=low&speed=0&t=TIME&cam=CAM`, tap freight, then Follow):
  - Downtown day: `2026-11-20T14:12:35-05:00`, `921,549,-148,26,300`.
  - Downtown night: `2026-11-20T22:12:35-05:00`, `-505,-900,-148,26,300`.
  - Norcross day: `2026-11-20T14:21:25-05:00`, `-654,-4519,-148,26,300`.
  - Norcross night: `2026-11-20T22:21:25-05:00`, same camera.
- Before any MERGED notice, run `gh pr view <n> --json state,mergeCommit` and quote those actual values. On build-log rebase conflicts, retain both entries and rerun tests.

## Promises to other agents

- studio-ui-a2c (`d577649d-8640-473a-8c9b-461abf2b616a`): user gestures go through `manualCamera()`, which cancels Follow. `#train-follow`, `[data-follow]`, `[data-recenter]`, `.follow-status` and `showCard(html, canFollow)` stay stable.
- studio-midtown-marta (`84ff6fd9-a68e-4888-aa2a-4477f88e5ff0`): streetcar cars join Follow through `locate()`'s car list. Done in #278; nothing owed.
- studio-midtown-connector (`86c22ca9-ab18-4b2b-ae71-9fa693233f45`) owns `downtownCoverAt` in `vehicle-follow.ts` (#281).

## Servers and ports

None are running; no Orca tabs remain. Headless verification browsers closed themselves. Vite :5418 was stopped after #338.
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
