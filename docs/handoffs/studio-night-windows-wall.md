# Handoff: night windows ride the wall draw (increment 2a)

- **Owner:** Studio materials owner (Claude). Coordinator: the Air city-view Claude.
- **Branch:** `samsolomon/night-windows-wall`, PR #721. Reviewer: Codex GPT-6.2 Sol, medium, two rounds. Waiting on the coordinator's final check and merge go. Nothing is merged.
- **What:** landmark lit panes draw in the wall draw at night, as glow ranges of the shared facade
  program (`web/src/materials/facade.ts`). Design note and budget: `docs/facade-night.md`.
- **Result:** High night 629 → 486 calls and Low night 523 → 380. Programs, geometry and
  triangles are unchanged. `test:perf` passed, with High night 486 against its new 535 ceiling.
  `pnpm test` passed.
- **Look:** matched-frame diffs equal the main-vs-main noise floor. Sheets are in
  `docs/log/facade-night/`.
- **Open:**
  1. Before release, on the iPhone 15 Pro and the A16:
     - one night frame, to check `gl_VertexID`: at 22:00 at the default view, landmark panes should glow as they do on release 19;
     - fps on Low at 14:00 and 22:00 with `&nightwall=off` vs on, from a frozen build, because the facade shader now runs for landmark batches by day too.
  2. Next step is increment 2b (programs phase A). Houses' two night-style programs could move onto
     the facade program there.
- **A/B switch:** `?perf&nightwall=off`.
- **Deploy:** needs only a rebuild. No `pnpm data`.
