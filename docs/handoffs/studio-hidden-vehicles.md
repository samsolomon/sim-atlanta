# Studio hidden-vehicles handoff (2026-11-28)

Owner: the hidden-vehicles agent on the Mac Studio (worktree `hidden-vehicles`, branch
`samsolomon/hidden-vehicles`). Coordinator: the Air City-view Claude. PR for release 21, not for
merge until the coordinator's go.

## Done

- Ghost tunnels and the selected-vehicle x-ray, as Sam approved on 2026-11-27 (approaches 1 and 2,
  with his track-window change replacing the dashed tunnel line). Design and rules:
  `docs/ghost-vehicles.md`.
- 0 new programs: ghosts ride the bus's instanced program, and the ink pass draws fill and line.
  Calls: +3 at most with nothing selected, +0 in the budget views (static views at the default
  camera, beyond ink's fade). Numbers: the PR body.
- Tests: `web/src/city/ghosts.test.ts` (underground classification, portal hand-off, track window,
  x-ray target hand-off through a follow tier handoff, and GL state restore).
- Stills: `docs/log/ghost-vehicles/`.
- Review: Codex (gpt-6.2-sol, medium), two rounds; all confirmed findings fixed.

## Next

1. Sam: look. Open questions are in the PR: ghosts also cover `covered` and `roofed` spans (so they
   never blink at a deck), and ghosts show through buildings in front as well as through the ground.
2. North Line (Midtown) and Brookwood tunnel ghosts: not in this PR (x-ray only while drawn).

## State

Head: the latest commit on the PR. There are no shared services. My dev servers (:5391, :5392 with
`/api` proxied to production for live buses) and headless Chromes are stopped, and the perf lock
is released. Data in this worktree came from `merge-batches`' staged data at the same base
(81db0d05e).
