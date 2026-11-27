# Studio white placeholder handoff (2026-11-27)

Owner: the streaming-look agent on the Mac Studio (worktree `white-placeholder`, branch
`samsolomon/white-placeholder`). Coordinator: the Air City-view Claude. Draft PR, not for merge
until the coordinator's go.

## Done

- Every mosaic area not loaded yet draws as the white study model: masses on a paper ground,
  one draw per area, 0 new programs. When it mounts, it dissolves into colour (draw-range
  stipple, 1 s, the opening's easing). Night is a lifted blue with cream ink. Design note:
  `docs/white-placeholder.md`.
- Bake: `web/scripts/placeholder.bake.ts` runs in `pnpm data:bake` (5 s) and writes
  `web/public/data/scene/placeholder/board.bin.gz` (222 KiB).
- Stills: `docs/log/white-placeholder/`.
- Budget A/B: in the PR body.

## Next

1. Sam: look. The night blue and the cream ink are a first pass from his note.
2. Sam: placeholder as the far form of loaded areas too? That saves about 9 MB of Low geometry,
   but the >15 km view turns white (see the design note). Not built.
3. Increment 3 (unload): call `placeholder.show(id)` when an area unloads. Add downtown to the
   bake if downtown can unload.
4. Masses for the 13 buildings City builds outside the area builders (Ebenezer, Heritage
   Sanctuary, The Brookwood, the Brookwood station, R16 seam buildings).

## State

There are no shared services. My dev server (:5391) and headless Chromes are stopped. Data in
this worktree came from `brookwood-prod-gate`'s staged data, plus `pnpm data:bake` on this branch.
