# Handoff: studio-midtown-connector (Claude → Codex, 2026-11-23)

## State
- The worktree is clean. Nothing is in flight, and none of the open PRs are mine.
- Last merged: #300, which skips drawing traffic cars that would overlap a streetcar. Earlier merges in this stream: #179, #186, #191, #199, #200, #204, #212, #223, #232, #239, #264, #268, #281 and #294.
- Coordinator assignment `msg_e0a8d4166d18` said "turns and signals for the illustrative arterial traffic (downtown and Midtown), so cars stop at lights and turn at intersections". Signals are done in #294, using `web/src/city/traffic-signals.ts` and `docs/traffic-signals.md`. **Turns are not started.**

## Sam's decisions for this area
- 2026-11-23, #231: truth tiers show on selected cards only, never as ambient area notes (see AGENTS.md). Freight stays `illustrative` on its card.
- Bridges over roads and highways need piers that avoid travel lanes. The shared helper is `web/src/terrain/pier-clearance.ts`.
- Tests must be deterministic, with measured budgets. Never just raise a timeout.
- Review screenshots are captioned BEFORE | AFTER composites, with a circle on the subject. Merge notices give GitHub blob links to `docs/log/...`, with the money shot first. Always say whether a change needs `pnpm data`.

## Next steps, in order
1. **Turns (PR 2 of turns and signals).**
   - Add turn courses as separate `TrafficCourse`s: approach, then an arc at a shared node, then exit.
   - Use illustrative turn shares, and allow only permitted directions. For example, no turn onto Spring St northbound or West Peachtree St southbound, because both are one-way.
   - Turning cars move only on green, using `signalPositions`.
   - Keep positions a pure function of the clock.
   - Engine: `road-traffic.ts`. Courses: `arterial-traffic-routes.ts`. Downtown: `arterial-traffic.ts`. Midtown: `midtown-arterial-traffic.ts`.
2. Optional: queue cars behind the streetcar, using TrainState `s` on the STREETCAR route, instead of #300's skip-draw. In #300, a car hidden by a bus or streetcar still holds its place in its signal queue.
3. Owed reply to the ground-contact agent (`msg_21e89bcd2680`, agent 1df827bc) about Midtown deck penetration sites:
   - midtown-upper: worst 83 cm at (125, -3641)
   - midtown-central: worst 28 cm at (-458, -2864)
   - midtown-south sidewalk: worst 9 cm at (370, -1870)
   Check each against lidar or 3DEP and against the decks in `midtown-connector-decks.ts`, then reply. `pnpm audit:ground --url …` reproduces them.

## Promises to other agents
- Ground-contact agent (1df827bc): the reply above.
- MARTA agent (studio-midtown-marta): #300 extended its `streetcar-cars.ts` with an optional `y` on `occupied()` and footprint heights. It's backward compatible, but tell them if you change it again.

## Servers and tabs
- Vite on :5289 in this worktree. One Orca tab, whose page id is in the session scratchpad. Both are stopped and closed at handoff. No worker runs.

## Rules that bit me
- cargo isn't on PATH on the Studio. Run `export PATH="$(dirname $(ls ~/.rustup/toolchains/*/bin/cargo | head -1)):$PATH"` before `pnpm test`.
- opencode and Grok aren't installed here. Use the code-review skill for self-review and say so in the PR body.
- The Orca browser runs at about 1 fps when unfocused, so fixed sleeps capture stale frames. Wait until `__diorama.stats()` is stable. For a frozen frame, use `?t=…&speed=0`, because `?t=` alone keeps ticking.
- `docs/build-log.md` conflicts on almost every rebase. Keep both sides.
- Name places from coordinates (`sceneToLonLat`, origin -84.3916, 33.7539), not from how they look. I mislabelled streets twice.
