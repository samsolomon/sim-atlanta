# Studio skins 1 handoff

The owner is the Claude Opus session in the `studio-skins-1` worktree. Report to the Air coordinator (`914b0cfd`, thread `msg_52f10bb4946a`) and the skyline lead (`47b1a596`). The lead owns `docs/building-skins.md` on `samsolomon/studio-building-skins` and runs the merge trains. Never merge or push to a PR in a train until the lead reports the train has landed.

## Merged

| Building | PR | Merge commit |
|---|---|---|
| Marquis One | #393 | `6f6a96ab` |
| Marquis Two, plus the lidar crown step for both | #406 | `a50b3ff5` |
| ViewPoint | #429 | `83d36d64` |
| 712 West Peachtree | #454 | |
| Marquis litHash | #494 | |
| Atlantic House | #510 | |

## Open and held

- **#527 Two Peachtree Pointe.** Approved, queued for train 8. The four-side sheet is posted as a PR comment.
- **#568 Southern Company Gas** (Ten Peachtree Place). Approved, queued for train 8.
- **#590 Marquis pier rework**, from the lead's audit. Held for the lead's approval and a normal train.

## Standing rules

These rules are in force tonight and are binding:

- **Images:** day 11:30 and night 23:30 images inline in the PR body, with the cam under each, plus one close view and a four-side day sheet at about 400 m. Look at each side for floating, missing or z-fighting parts.
- **Bearings:** `cam` bearing is the view heading. Bearing 0 looks north and shows the south face. Scene z is −north.
- **Checks:** run `pnpm build`, `pnpm test` and `pnpm test:perf` (low, high, high-night) with main measured in the same session. Report calls, triangles and geometry MB deltas.
- **Batching:** vertex colour only, so the skin batches. Lit panes use skin-kit `litHash`, never a linear modulus. Change the night look only in `setNight`.
- **Glass:** rendered sunlit S 36 or less (teal 40) and V 40 or more, using the base table in docs/glass-palette.md. Record the shaded value as advisory.
- **Recognition:** passes come from the real building's features. Cite the photo behind every colour or contrast change.
- **Shared Studio:** no pattern kills, so kill only your own PIDs. Scripts attach only to a Chrome they launched (port 0, DevToolsActivePort; see `scripts/chrome-cdp.mjs`).

## Tools

- **Lidar:** `.venv` with `laspy[lazrs]`. Call `pipeline/scripts/king_memorial_corridor.ept_points((w,s,e,n))`. The downtown origin is 33.7539, −84.3916.
- **Captures:** the session's `shots.mjs` (CDP, own Chrome) and `foursides.sh` (sheet helper) live in the scratchpad. Recreate them from `scripts/chrome-cdp.mjs` if they are lost.
