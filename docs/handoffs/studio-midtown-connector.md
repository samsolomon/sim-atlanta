# Studio Midtown Connector handoff · 2026-11-25

**Paused at Air’s request.** The assembled checkout tested was `50caf703c2db956c8d9757eb3e55021464982f28`. The production traffic and rail contribution is `48cb1bb78a6ee6dc1a72c8fe619b1aa05e38f910` on `codex/clean-expansion-traffic-rail`.

Fresh `pnpm data` completed. All nine context, ground metadata and terrain files for Brookwood South, Brookwood Station and R16 matched the accepted SHA-256 manifest. Data generation started on `d4577b25`. The four changes through `50caf703` affect tests only.

On `50caf703`, Rust passed 20 tests and two Python groups passed 11 and 7. Air stopped verification during the web suite. Its partial log records six failures across four files:

- `skin-footprint.test.ts` — one landmark footprint assertion.
- `midtown-foundations.test.ts` — both tier-specific roof-to-ground assertions.
- `midtown-connector.test.ts` — both mounted surface checks.
- `ground-map.test.ts` — the ground texture budget assertion.

The worker suite was still queued when the process group stopped. The fresh checkout is under `/tmp/connector-fresh-verify.G7thU79j/final`. Its parent directory retains `final-data.log`, `final-test.log`, `final-hashes.json` and `accepted-hashes.json`.

**Next step on release from pause:** reproduce the six failures in the retained checkout, collect assertion details, then rerun the complete suite. Phone owns performance and City smoke. Fifth Street remains paused.

---

# Handoff: studio-midtown-connector (Claude → Codex, 2026-11-23)

## Codex continuation — 2026-11-23

- Arterial turns merged as #340. Twenty Midtown turn courses; incoming signal
  phase, one-way rules and direct 15% illustrative turn share. Known limitation:
  turn and through courses have independent queues with overlap suppression.
- Next handoff item implemented on `codex/streetcar-traffic-queues`: three downtown
  courses follow scheduled streetcars using deterministic half-second replay.
  See `docs/streetcar-traffic-queues.md` and its comparison captures. The S70 model,
  live buses, Connector and Midtown traffic interfaces remain unchanged.
- Ground-contact successor is `orca_session_id:acad9721-185c-4ee8-84df-9fb8fe9fac1e`.
  Initial measurements were sent: upper ground 272.960 m NAVD88 versus nearby
  approach 272.337 m, axis 6.2 m away. Central and south are 487 m and 173 m from
  the nearest surveyed Connector profile and remain unassigned pending a fresh
  audit with mesh/path attribution. No surveyed heights have been changed.
- Coordinator messages work by replying to `msg_ca3634b98b19`; direct sends to
  the saved Air environment rejected its pairing token. Only coordinator deploys.
- Claude cross-review now works here through `pnpm review -- --reviewer claude`.
  A stale staged Midtown landscape caused the tree test to fail; restaging with
  `node scripts/stage-square-board.mjs --midtown` fixed it without source changes.

The original Claude handoff below records the earlier state.


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
