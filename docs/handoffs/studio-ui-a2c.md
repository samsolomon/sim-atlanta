# Studio UI handoff to Claude Opus

**Status (2026-11-23, Claude Opus):** Sam approved #387 through the coordinator, and it merges with this note. The PR body embeds day, night and close-view screenshots per Sam’s standing rule (`docs/log/ui/radio-glyph/day-night.jpg`, `phone-day-night.jpg`, `close-before-after.jpg`). No Studio UI work is open. Seen while capturing, not fixed: at night the City “3D” chip renders as a blank white square, on main as well as this branch.

The only outstanding decision is Sam’s visual approval of [draft PR #387](https://github.com/samsolomon/sim-atlanta/pull/387). The branch is `samsolomon/ui-radio-next-glyph`. Its implementation commit is `65e55413a534fdbd4dd755e3702d187c1b90af17`. GitHub reported OPEN, draft, and a null mergeCommit at handoff. This document is the only change after that reviewed commit. All work is pushed.

## Sam’s request

The coordinator’s subject was “Sam: skip icon on the radio player is too big”. The relay contains no separate verbatim quotation from Sam. Its exact description and instruction were:

> Sam flagged the compact radio player in City: the Next-track glyph is about twice the size of the pause glyph and looks oversized.

> Make Next match the play/pause glyph's optical size and stroke weight, keep the 44x44 targets, and check that nothing else needed that rule. Small PR with before/after crops on desktop and a 390px phone. Don't merge until I relay Sam's OK.

## Implementation and verification

Only Next matched the removed `.a2-player .a2-ib:last-of-type svg` rule. Play/Pause and Next now share an 18 px SVG box, 24-unit viewBox and 1.8-unit stroke. The separate Play circle rule remains. The Radio section of `docs/ui-controls-brief.md` records the correction.

Chrome measured both targets at 44 × 44 before and after. At 1440 × 900 and 390 × 760, Pause measured 18 px throughout and Next went from 36 to 18 px. Sam has the matched crops. [Desktop before](../log/ui/radio-glyph/desktop-before.jpg) · [Desktop after](../log/ui/radio-glyph/desktop-after.jpg) · [Phone before](../log/ui/radio-glyph/phone-before.jpg) · [Phone after](../log/ui/radio-glyph/phone-after.jpg)

To reproduce, start `pnpm --dir web exec vite --port 5730 --strictPort`. Open `http://localhost:5730/?view=city&q=low&t=2026-11-20T14:00:00-05:00&cam=565,-3965,-101,55,421`, open Radio, and press Play to show Pause beside Next. This Studio has the capture helpers at `/tmp/radio-glyph-crop.mjs` and `/tmp/radio-glyph-shots.sh`. The player labels its silent preview “No audio yet”.

On the implementation commit, `pnpm test` passed (1,076 web tests passed, one skipped, five worker tests passed). Python pipeline checks skipped because this worktree lacks `.venv`. `pnpm build` passed. Claude cross-review via `pnpm review -- --reviewer claude` returned no findings. The change affects browser CSS and requires a web rebuild at deployment. No City geometry or data changed. All owned preview servers were stopped and the capture browsers closed.

## Next steps in order

1. Read `AGENTS.md` and check for a coordinator reply. To read this outgoing Codex session, use `orca agent read --id orca_session_id:9d1a7658-bc7f-4725-ba5f-fb9f8f5f8d34 --limit 100`. The current Air coordinator is `term_09e1b3da-5f48-4755-abf8-92a571a1f474`. Use `orca orchestration check` and reply to the radio thread (`msg_328da0f1c97c`) or handoff thread (`msg_d0f513259a48`) with your own session ID. Direct sends previously hit a pairing-token rejection.
2. Keep #387 draft until the coordinator relays Sam’s OK. If Sam asks for adjustments, update this branch, rerun the checks, and send fresh matched crops. The screenshots and PR have already been sent for this revision.
3. After explicit clearance, fetch main and check the diff, mergeability and review status. Recheck any changed implementation. Mark #387 ready and merge. Before announcing MERGED, run `gh pr view 387 --json state,mergeCommit` and quote both returned fields in the coordinator reply with the screenshot links and camera string. Only the coordinator deploys.

## Final layout already on main

| PR | Delivered | Verified merge commit |
| --- | --- | --- |
| #310 | Classic removal | b4fae8d5215bfe252994c8c943fe4a34a05f0163 |
| #373 | Final dock and camera group | 579239543b37bd5f9b2bbcf528959e187c2d1f62 |
| #376 | Models browser, Details, framing and paused City | d3ea752c8bbbcc4915221fc044f51d8234c48258 |
| #379 | Compact and expanded train, bus and freight selections | 100df928461f8befcbb063144bad179b531148f7 |
| #382 | Compact radio player and desktop search fix | b71b863fa0e4f813e8125a16dab04932075271af |

Models keeps City resident while pausing its render loop. The coordinator’s A16 warm returns measured 278 and 569 ms, down from 12.8 and 15.2 seconds. Cold builds measured 16.1 and 10.9 seconds. The dev-only probe is `?perf=models-return`. See `docs/log/ui/final-models/`, `final-selection/` and `final-radio/` under the same parent for the earlier approvals. Building picking is a separate follow-up in the brief. The earlier handoff also deferred weather in frozen share links and staged white-model loading work. Check current main and coordinate with phone-perf before taking on any loading changes.
