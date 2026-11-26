# Studio integrator handoff (2026-11-26)

The Studio integrator packages releases on the Mac Studio, owns its performance window and
works for the coordinator on the MacBook Air. Nothing merges or deploys without the
coordinator's go.

## Done

- **Release 18 (`6c5aa4e6`) is live.** Rollback is release 16 (`8678645f`). Packages and their
  evidence folders (scripts included) are in `~/Developer/` on the Studio as
  `sim-atlanta-release-<sha>` and `-evidence`.
- #699: Low `trafficMean` ceiling 1.0 ms; `connectorMs` is the guard for Connector sampling.
- #702: CI runs `pnpm test:release` and the web build on every PR and push to `main`.
- Checks by risk and the Grok self-review: `docs/review-charter.md`.

## Next

1. **Boot-freeze profile (top priority).** The iPhone freezes about 10 s before ready, in the
   boot stages (`stage:terrain`), unchanged from release 16 to 18; downtown still builds in one
   task. Send results to the coordinator and the baked-ground agent, whose downtown slice
   depends on them.
2. Follow-up: `src/vignette/road-semi.test.ts` runs close to Vitest's 5 s default and can pass it
   under load (about 4.5 s alone on the Studio, 14 s on CI, which allows 60 s).
3. **MARTA's timetable ends 2026-12-11.** A data refresh and release are needed before then.
4. Building batches follow the merge plan on `samsolomon/north-expansion-lead-handoff`
   (`7a94a136`), with `test:perf` after each batch. Programs and night draw calls have little
   headroom; Sam decides any ceiling raise. Clubhouses: cherry-pick only, and never push
   private history below `74e0f9f0`.

## Studio rules

- Before a timed run, have every other agent stop builds, test suites and headless browsers,
  and wait for their replies. Lightweight work, such as editing or a Grok review, continues.
  Another agent's runs have overlapped release timings.
- Stop only processes you started, by process ID.
