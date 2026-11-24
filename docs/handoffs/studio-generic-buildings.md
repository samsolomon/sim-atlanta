# Generic building exteriors

## Current state and next steps (2026-11-24)

Sam approved the City default. [PR #644](https://github.com/samsolomon/sim-atlanta/pull/644) integrates release 12 (`39bf4022`). The tested code is `a5f60d1e`. The strict suite and perf checks passed, including Low at 175.8 MB and High at 297.1 MB geometry. At downtown-wide, both the default versus explicit v2 and legacy versus release 12 matched in all 1,600,000 pixels on each tier. Use a fresh browser profile for each frame, with seeded randomness and simulation and animation time held fixed. The East Portal illustration's exported world GLB matched byte for byte. [Matched comparison](../log/ui/generic-buildings/release-12-comparison.jpg).

The lead owns the merge slot. After merge, notify the #613 owner so the far-board mesh can pick up the facade tone. Release 12 does not contain that mesh. The PR body tracks final review and readiness.

City uses the eight facade archetypes by default. Add `generic=legacy` to a City URL for the previous appearance. The standalone vignette still opts in with `generic=v2`.

[PR #644](https://github.com/samsolomon/sim-atlanta/pull/644) contains the approved treatment. The [design and camera notes](../generic-buildings.md) cover the archetypes, their assignment and the glass measurements. The [comparison sheet](../log/ui/generic-buildings/final-sheet.jpg) shows the same four camera positions at 11:30, 17:25 and 17:50.

The low tier uses flush bases. The high tier retains cornices, caps and soffits. To integrate the far board, apply `v2StyleTone(style, wallRgb)` to each triangle before taking the area-weighted mean wall colour. Both the input and output are linear RGB, in the same space as the vertex colour attribute. Keep roofs separate.
