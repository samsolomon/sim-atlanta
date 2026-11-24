# Studio skins 2 handoff

Sam’s request was “skin the remaining large/important buildings”. The assigned order is 171 Seventeenth, 903 Peachtree, then 999 Peachtree. Each building gets its own branch and PR. The skyline lead confirmed scope is the mapped parent and verified parts, including 903’s parking screen on levels 2–7, streetfront and tower. Adjacent buildings, independently mapped decks, bridge and approach roads are outside this work. The survey lives on `origin/samsolomon/studio-building-skins` at `682b78aa` or later.

## Ready for Sam

All merges are held until the Air coordinator explicitly relays Sam’s OK. Reply to the coordinator’s welcome message `msg_49488d9d6c30` from this session while available, or use the successor’s welcome message if one arrives. The Air directly rejected the pairing token when I tried to open a review tab. All rendered review views are available in the PR READMEs.

| Building | Branch and PR | Evidence |
|---|---|---|
| 171 Seventeenth | `samsolomon/171-seventeenth` at `1ebee865`, [PR #388](https://github.com/samsolomon/sim-atlanta/pull/388) | [Day, full night and close](https://github.com/samsolomon/sim-atlanta/blob/1ebee865/docs/log/ui/171-seventeenth/README.md) |
| 903 Peachtree | `samsolomon/903-peachtree` at `0d9911a3`, [PR #392](https://github.com/samsolomon/sim-atlanta/pull/392) | [Day, full night and close](https://github.com/samsolomon/sim-atlanta/blob/0d9911a3/docs/log/ui/903-peachtree/README.md) |

Both branches passed `pnpm test` including the Python pipeline checks and `pnpm test:perf` against main `59b8cbc9` with their own change applied and all 12 areas mounted. Low/high programs were 90/105 for baseline and both branches. Calls were 569/1195 on both branches against ceilings of 600/1250. Low/high triangles were 2,361,403/13,904,045 for #388 and 2,362,205/13,905,161 for #392. Claude review found zero issues for #388. Claude exited 1 without a report twice on #392, so I ran the repo’s `pnpm review -- --reviewer codex` as fallback. That review found zero issues.

- 171 paired camera `cam=-255,-4181,-118,50,490`, close `cam=-200,-4158,-68,53,330`. Day 10:30 and night 23:00 ET.
- 903 paired camera `cam=780,-2860,64,47,500`, close `cam=733,-2812,69,49,270`. Day 14:00 and night 23:00 ET.
- Both use `?view=city&q=low&t=2026-11-20T<time>-05:00&cam=<camera>`.

## Current branch and next steps

1. Continue `samsolomon/999-peachtree` at draft commit `4e5773c8` plus this handoff. The initial shell and board wiring are in place. No PR or browser/perf verification yet. Survey camera `728,-3026,32,60,360` is a starting point. Try a 490 m orbit at 48–50° over Peachtree with a target shifted away from the camera by roughly 55 m so the top fits above the app toolbar. Check the main-frame/bay depth and recessed west entrance at closer range, as well as grade around all sides, seams between part faces, and whether the crown requires a warm accent. Watch for duplicate internal stone faces on adjacent parts and assess whether the 54.6 m west shoulder needs its stepped frame refined from the photos.
2. Reference photos already consulted in fresh Orca tabs include the [Colliers entrance close-up](https://listingsprod.blob.core.windows.net/ourlistings-usa/029c3a00-fd72-436f-91a8-cb5d39ad3af0/e1d2df09-f24c-44d2-9da5-7b8e1e474e7b) and [CBRE dusk oblique](https://www.cbre.com/press-releases/chamberlain-hrdlicka-inks-30773-sf-lease-in-midtown-atlanta). The dusk image shows the recessed upper glass, pale piers, white lower frames, intermittent windows and a warm crown cap. Look for reliable full-night evidence or document the gap and avoid inferring decorative lighting from the dusk exposure. The 67 × 41 m parent is `osm:way:886036475`. The mapped parts preserve the recessed 9.3 m entrance, 14.2 m side masses, 54.6 m frames, 117.6 m shaft and 120.4 m center cap. No tenant or operator logos. Keep the shared landmarkShell materials and check program counts on both tiers.
3. Stage or reuse local data. This worktree already has `.venv`, dependencies (including shapely for the pipeline tests) and staged data. Use `pnpm dev --host 127.0.0.1 --port 5178 --strictPort`, then wait for City to show Timetable and finish its texture upload before capture. `window.__cityDev?.areaCount()` should return 12, though the textures may still be uploading at that point. Save the matched day/full-night and close views with camera strings, link the sources in its review README, append the dated build log entry, test both tiers on current main, run the cross-review and open the PR.
4. Upon explicit approval from the Air coordinator, handle PRs in the assigned order. Each PR imports from and edits the same landmark dispatch in `web/src/terrain/model.ts` and appends to `docs/build-log.md`, so expect a merge conflict after each prior merge. Preserve both dispatch arms and both log entries when updating later branches from main. Re-run `pnpm test` and `pnpm test:perf` on the combined latest main before each merge. Relay the verified `gh pr view <number> --json state,mergeCommit` after each merge.

Temporary review and test logs are in `/tmp/sim-skins-*-{test,perf,review}.log`, including `/tmp/sim-skins-903-final-perf.log` and `/tmp/sim-skins-903-review-codex.log`. Dev server and research tabs were closed for handoff.
