# Handoff: night windows ride the wall draw (increment 2a)

- **Owner:** Studio materials owner (Claude). Coordinator: the Air city-view Claude.
- **Branch:** `samsolomon/night-windows-wall`. The PR, head and reviewer are in the PR body.
- **What:** landmark lit panes draw in the wall draw at night, as glow ranges of the shared facade
  program (`web/src/materials/facade.ts`). Design note and budget: `docs/facade-night.md`.
- **Result:** High night 629 → 486 calls and Low night 523 → 380. Programs, geometry and
  triangles are unchanged. `test:perf` passed, with High night 486 against its new 535 ceiling.
  `pnpm test` passed.
- **Look:** matched-frame diffs equal the main-vs-main noise floor. Sheets are in
  `docs/log/facade-night/`.
- **Open:**
  1. One night frame on the iPhone 15 Pro and the A16 before release, to check `gl_VertexID`. At
     22:00 at the default view, landmark panes should glow as they do on release 19.
  2. Next step is increment 2b (programs phase A). Houses' two night-style programs could move onto
     the facade program there.
- **A/B switch:** `?perf&nightwall=off`.
- **Deploy:** needs only a rebuild. No `pnpm data`.
