# Skins-6 checkpoint, 2026-11-25

**150 Carnegie Way.** Skins-6 owns the feature branch `samsolomon/150-carnegie-garage`. Product commit `bae6342c5840e1b9a6a80565f52f15666c01a07f` adds the garage, its City mount and fixture tests. The two focused tests passed on an earlier prototype. The final entrance and roof geometry still need exact-head validation. The three queued checks stopped before running.

On resume, reconcile the City mount against the integration base, then run the strict suite, build and locked perf check. Capture four sides and matched daylight/night views, check recognition at 500 m, and complete independent review before a PR. Suggested camera is `cam=244,-482,225,55,500`. Night lighting is estimated. The adjoining skybridge has its own footprint.

**NCR sky garden.** Skyline owns integration. The validated handoff is `samsolomon/ncr-sky-garden` at `df1f7fc1ff9f344bd6925d87c41a3e69665e9f69`. Its build, strict suite, perf and matched visual smoke passed on base `654b9ba4`. The source and tests match the visually accepted `4844c0a1`. See `docs/log/ui/ncr-hq/README.md` on that branch for the two captures and the nonblocking planter-alignment follow-up.
