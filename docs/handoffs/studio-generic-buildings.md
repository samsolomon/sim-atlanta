# Generic building exteriors

## Current state and next steps (2026-11-24)

The final sheet was approved. [PR #644](https://github.com/samsolomon/sim-atlanta/pull/644)
is still a draft, with the City default and explicit legacy rollback pushed. The feature
head is `fdcc83d8`, based on main `d93c51d8`. Release 12 has a provisional slot after
#654, #613, #446 and Fifth Street. Release 11 currently has priority. All captures, servers
and queued check processes for this worktree have stopped.

1. After the release pause lifts, run heavy checks serially via the shared `.perf-run 644`
   wrapper. Run the full `pnpm test` suite with the pipeline Python environment available
   and run `pnpm test:perf`. The prototype passed the production budgets at 169.9 MB
   low and 291.2 MB high, including high-night at 291.5 MB. The first full suite passed.
   A subsequent concurrent run hit six timeouts. The post-activation unit check for
   building parts and the URL selector passed all four tests.
2. Finish the post-activation visual comparison. The approved prototype matched its
   main merge-base at both tiers (zero changed pixels out of 1.6 million each). Now compare
   the default to explicit v2, and legacy to current main, on each tier at the downtown-wide
   camera. Pin simulation time and the film-grain animation timestamp. Finish the Old
   Fourth Ward night frame and third glass probe, then inspect the complete sheet. The PR
   currently embeds the approved prototype sheet.
3. Run the cross-model review for the default-switch diff and triage findings. The two
   pre-activation rounds are complete. A reversed deck-footprint predicate was fixed and
   the second round reported no findings.
4. Update the PR body with candidate results and screenshots. Mark it ready and confirm
   readiness with the merge lead. Wait for the slot. After merge, notify the far-board
   owner so its distant wall tones can follow.

City uses the eight facade archetypes by default. Add `generic=legacy` to a City URL for the previous appearance. The standalone vignette still opts in with `generic=v2`.

[PR #644](https://github.com/samsolomon/sim-atlanta/pull/644) contains the approved treatment. The [design and camera notes](../generic-buildings.md) cover the archetypes, their assignment and the glass measurements. The [comparison sheet](../log/ui/generic-buildings/final-sheet.jpg) shows the same four camera positions at 11:30, 17:25 and 17:50.

The low tier uses flush bases. The high tier retains cornices, caps and soffits. To integrate the far board, apply `v2StyleTone(style, wallRgb)` to each triangle before taking the area-weighted mean wall colour. Both the input and output are linear RGB, in the same space as the vertex colour attribute. Keep roofs separate.
