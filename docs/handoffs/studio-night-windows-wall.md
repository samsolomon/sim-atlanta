# Handoff: night windows ride the wall draw (increment 2a)

- **Owner:** Studio materials owner (Claude). Coordinator: the Air city-view Claude.
- **Branch:** `samsolomon/night-windows-wall`, PR #721. Reviewer: Codex GPT-6.2 Sol, medium, two rounds. The coordinator approved it on 2026-11-27, confirmed the 535 ratchet and will merge it once CI is green.
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

## Device pass (release 20, coordinator runs it)

**Frozen build:** `~/Developer/sim-atlanta-nightwall-frozen` on the Studio, built from `661773b1`.
Later commits touch docs only. Serve it per docs/perf.md's device protocol, from `web/` in this
worktree:

```sh
npx vite preview --outDir ~/Developer/sim-atlanta-nightwall-frozen --host 0.0.0.0 --port 4690 --strictPort
```

Run each pair on the iPhone 15 Pro and the A16. For the A16, run each URL twice and take the median,
as docs/perf.md says. With `P=http://localhost:4690/?view=city&q=low&perf=run`:

| # | What | On (this PR) | Off (old night draws) |
|---|---|---|---|
| 1 | Night look and fps, default view | `$P&t=2026-11-20T22:00:00-05:00` | `$P&t=2026-11-20T22:00:00-05:00&nightwall=off` |
| 2 | Day fps (the facade shader now runs for landmark batches by day too) | `$P&t=2026-11-20T14:00:00-05:00` | `$P&t=2026-11-20T14:00:00-05:00&nightwall=off` |
| 3 | Night look on High, desktop or iPhone | `http://localhost:4690/?view=city&q=high&t=2026-11-20T22:00:00-05:00&speed=0` | same URL plus `&perf&nightwall=off` |

- **Pass, look:** landmark panes glow the same, on vs off. If panes are dark, lit in the wrong
  places or lit as whole walls, the device mishandles `gl_VertexID` with a non-zero first vertex.
  If that happens, block the release and send it back to the materials owner.
- **Pass, fps:** "on" is within run-to-run noise of "off" at 14:00. At 22:00, "on" should be equal
  or better, with about 143 fewer calls.
- **Expected calls, Low:** 345 at 14:00 for both. At 22:00, 380 on vs 523 off.
