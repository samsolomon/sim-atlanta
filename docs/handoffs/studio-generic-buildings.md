# Generic building exteriors

City uses the eight facade archetypes by default. Add `generic=legacy` to a City URL for the previous appearance. The standalone vignette still opts in with `generic=v2`.

[PR #644](https://github.com/samsolomon/sim-atlanta/pull/644) contains the approved treatment. The [design and camera notes](../generic-buildings.md) cover the archetypes, their assignment and the glass measurements. The [comparison sheet](../log/ui/generic-buildings/final-sheet.jpg) shows the same four camera positions at 11:30, 17:25 and 17:50.

The low tier uses flush bases. The high tier retains cornices, caps and soffits. To integrate the far board, apply `v2StyleTone(style, wallRgb)` to each triangle before taking the area-weighted mean wall colour. Both the input and output are linear RGB, in the same space as the vertex colour attribute. Keep roofs separate.
