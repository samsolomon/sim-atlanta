# Studio Regions Plaza second pass handoff (2026-11-27)

Owner: the landmark-skin agent on the Mac Studio (worktree `regions-plaza-2`, branch
`samsolomon/regions-plaza-2`). Coordinator: the Air City-view Claude. For release 21. Not for
merge until the coordinator's go.

## Done

- `web/src/city/regions-plaza.ts`: its own look. Pale near-neutral ivory stone (`#ddd6cc`), five
  tiers of three floors over a ~20 m base, window pairs between wide piers, an arched entrance, pier
  finials, and a grey-green slate hip floodlit cream at night. Same lidar heights. Vertex colours
  only: 0 programs, 0 draws, triangles 2,726 → 2,084.
- The test now fails on the old skin (stone saturation, lighter than One Atlantic's granite, cool roof).
- Research, sources and colour samples: `docs/log/ui/regions-plaza/README.md`. Stills:
  `docs/log/ui/regions-plaza/`.
- Codex review: 2 rounds, 3 minor geometry findings, all fixed.

## Next

1. Sam: look at the pair still. If the stone should go pinker, change `regionsStone`. The midday
   listing photo is rose, but the same-light frame says near-neutral.
2. The only night exterior predates the 2014 renovation (README, Evidence).

## State

No shared services. My vite servers (:5291, :5292), headless Chrome and the merge-base worktree
are stopped, and the perf lock is released. Data was rsynced from `day-fps-r21`, then `pnpm data:bake` ran on this head.

## Update 2026-11-28 (Sam via the coordinator)

Regions now takes One Atlantic Center's exact facade values (granite `#ccaea0`, trim, glass, light
frames) from the shared `oneAtlanticFacade` in `johnson-burgee.ts`. The massing, slate hip and lamps
are unchanged. Vertex colours only: 0 programs, 0 draws. The ashlar hook is deliberately not used;
see the README. #734 is rebased on main. Waiting on Sam's merge go.
