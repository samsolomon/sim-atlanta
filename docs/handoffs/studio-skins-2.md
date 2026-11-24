# Studio skins 2 handoff

**Claude session:** `orca_session_id:4695b411-cb1b-417d-a6c6-ce083fc4479c`. Read its history with `orca agent read` for full context. The predecessor was Codex `94a6c83c-dbc8-48c0-b7be-57ef54461228`.

Sam's request: "skin the remaining large/important buildings." The skyline lead (`orca_session_id:47b1a596-9151-4aee-9df7-2767a8c93529`) assigns rows, approves skins (Sam delegated) and merges them in trains. **Never merge a skin PR yourself.** Report each PR to the lead by replying to the lead's latest message (`orca orchestration reply --id <their incoming msg id>`; replying with your own id loops back to you). The Air coordinator relays Sam's decisions.

## Open PRs (all pushed; worktree clean)

| PR | Building | Head | Status |
|---|---|---|---|
| #533 | Lilli Midtown | `7fca0228` | Approved by the lead; waiting for train 8c |
| #591 | Circa 730 | `f1e29923` | Approved by the lead; waiting for train 8c |
| #563 | Trace Midtown | `2cc9f035` | Approved; in the train 8 queue. **Open:** high-tier geometry +0.5 MB, over the ~0.2 target. I offered to collapse the high-tier balcony slabs to a strip; no answer yet |
| #617 | 715 Peachtree | `1df90cb0` | Sent to the lead for review |
| #634 | Olympia Building (downtown) | `818737e0` | Sent to the lead for review |
| #642 | Elevance Health Technology Center | `70b31518` | Sent to the lead for review. Ships **without the 16th-floor sky bridge to 712 West Peachtree** (option b, my stated default; the lead never answered). The bridge spans 12.3 m past the footprint, beyond the audit's 2.5 m. Follow-up: a per-part allowance in `skin-footprint.test.ts` / `skin-kit`, then add the bridge (code in the history at `47bc6c98`) |

Latest pushes on #563, #617, #634 and #642 are the coplanar-layer fix (all layers ≥ 3 cm off the wall), which was offset-only (tsc clean, footprint test passes). They still need a rebase and full re-measure before their trains.

Merged earlier: 171 Seventeenth #388, 903 #392, 999 #408, 10 10th #419, Nomia #422, Proscenium #433, Hanover #448, Sora #457, Modera #473, The Standard #475, Crest #526, and the four-side sheet script #549. The Modera Parkside strengthening moved to the culture agent.

## Next steps, in order

1. When the lead calls a train or asks: rebase each open PR on main, rerun `pnpm build`, `pnpm test` and `pnpm test:perf` against a same-session baseline, then update the PR body.
2. Trace's geometry: act on the lead's answer.
3. The Elevance bridge follow-up, as above.
4. Take new rows from the lead. Priority is **downtown named generics first** (around the Westin, Bank of America and Peachtree Center blocks); expansion is paused.

## Sam's and the coordinator's decisions that affect skins

The coordinator named these decisions from today; see their messages and docs for details. I only applied the ones marked *.
- Flat glass; far-board; landmark LOD; far shadows; tree far form; streaming flag; 1075 glass B.
- *Expansion paused; generic buildings are the priority (downtown first).
- *0.45 shade floor (#631): shaded glass is floored in the shader. Pick glass against the **sunlit** rule only: rendered sunlit S ≤ 36 (teal 40) and V ≥ 40, using the base table in `docs/glass-palette.md`. Don't compensate for shade, and don't report shade readings.

Standing rules for every skin PR:
- Features come first, from photos of the real building, cited. Plain passes if the building is plain.
- Lidar-check the height (estimated, post-2019 and parking polygons can hide phantom towers).
- Before/after money shot at 400–600 m.
- Day 11:30 and night 23:30, a close view, and a four-side sheet (`node scripts/four-side-sheet.mjs …`; needs `pnpm dev`; panels are labelled by the face shown, and bearing 0 shows the south face).
- `skin-footprint.test.ts`: in the footprint, 0 detached. It doesn't cover downtown `city.ts` landmarks.
- Coplanar layers ≥ 3 cm off the wall; 4–8 cm is better.
- Low tier: ≤ 2,400 triangles and about +0.2 MB geometry per tier, with deltas against a same-session baseline on the merge-base.
- `litFacade` from `skin-kit`, vertex colours only, night changes only through `setNight`.
- No logos (Olympia's sign is a blank neutral panel).
- Downtown skins mount in `city.ts`: the chain, `world.group.add`, the `listed` array and `setNight`.

## Gotchas

- **Shared Studio:** never pattern-kill (`pkill`/`killall`); stop only PIDs you recorded. Drive only a Chrome you launched (`chrome-cdp launchChrome`). Run build, test and perf one after another; under load, `residential`/`east-rail` tests time out, so rerun them alone.
- **Dispatch conflicts:** every Midtown skin edits the dispatch in `web/src/terrain/model.ts`. On rebase, keep one arm per id; my resolver once left a duplicate Lilli arm.
- **Podium excludes the tower:** start tower parts at grade. Rotated-frame probes and multi-ring parts can silently null a skin.
- **Hidden faces:** many review faces are hidden or shaded at 11:30 (Circa, Lilli's base, Five Points). Say so in the PR rather than inventing contrast.
- **zsh:** in `git show`, brace the variable: `"${b}:path"` (unbraced `$b:w…` is a modifier).
- **Dev server:** I ran `pnpm dev --host 127.0.0.1 --port 5178`. On the default host, use `--base http://localhost:<port>` for the sheet script.
