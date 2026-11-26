# Sim Atlanta — Agent Guide

A free, fast map of where Atlanta's trains are, or are likely to be, right now. It is
becoming an art project: a real-time, low-poly 3D miniature of Metro Atlanta that starts
downtown (Five Points / the Gulch) and will grow to a square enclosing I-285 and the entire Atlanta airport. Pixel art is an optional render
style.

> This is the only project guide, and every agent reads it. Codex reads `AGENTS.md` natively,
> and Claude Code (v2.1.277+) reads it whenever no `CLAUDE.md` exists. **Don't add a
> `CLAUDE.md`** (from `/init`, for example). If one exists, Claude reads only that file and
> stops reading this one. If you need one anyway, make its whole body `@AGENTS.md`.
> Repo skills live in `.agents/skills/` (Codex), and `.claude/skills/` symlinks to them
> (Claude). Edit the files under `.agents/` only.

## Layout

- `pipeline/`: Rust, plus Python helpers in `pipeline/scripts/`. Downloads open data (MARTA
  and Amtrak GTFS, FRA crossings, BTS/FRA rail network, Overture buildings) and writes compact
  static files to `web/public/data/ga/` and `web/public/data/scene/`. Both are gitignored, so
  run `pnpm data` in a fresh checkout.
- `web/`: TypeScript, Vite, MapLibre GL (2D map), and Three.js (`src/scene3d/` downtown
  diorama, `src/vignette/` East Portal look study). The canonical types are in
  `web/src/model/types.ts`. Pipeline output must match them, and `*.contract.test.ts` checks
  this.
- `worker/`: a Cloudflare Worker. It serves `web/dist` and `/api/marta/rail`, which proxies
  MARTA's realtime API with a secret key, normalizes the response, and caches it for 10 s.
- `docs/data-model.md`: truth tiers, identifiers, geometry, and colour. Read it before you
  touch anything users see.
- `docs/art-backlog.md`: art ideas and decisions for the diorama.
- `docs/build-log.md`: a running log for a future blog post (see below).

## Commands

```sh
pnpm install
pnpm data            # build map data + downtown scene (needs .venv, see README)
pnpm data:vignette   # East Portal diorama data
pnpm secrets:local   # worker/.dev.vars from 1Password (needs `op` signed in)
pnpm dev:worker      # live API on :8787
pnpm dev             # http://localhost:5173, proxies /api to the worker
pnpm test            # Rust + pipeline + web + worker tests (pipeline skips without .venv)
pnpm test:release    # same, but fails if the pipeline checks cannot run
pnpm build           # web/dist, which the worker serves
pnpm test:perf       # City budgets per tier, headless Chrome (needs Chrome + data; docs/perf.md)
pnpm review          # cross-model review of this branch (see "Review")
```

## Seeing your work

Most changes here are visual, and tests can't tell you a scene looks right. After a UI or
scene change, run `pnpm dev` (plus `pnpm dev:worker` if you need live data), open the page in
a browser tool, and take a screenshot before you call it done. These URL options make views
reproducible:

- `?t=2026-11-20T14:00:00-05:00` pins the clock, and `?speed=30` plays time faster.
- `#zoom/lat/lon` sets the 2D map view, and `?view=3d` opens the downtown diorama.
- `/?view=city&cam=565,-3965,-101,55,421` targets Five Points x and z (metres), bearing clockwise from north and tilt from vertical (degrees), and orbit distance (metres). City samples ground height and clamps the view to its board and orbit limits.
- `&dev&mindist=20` (dev server only) lets City's orbit come in to 20 m (5 m minimum) instead
  of 150 m, for close review shots of furniture, gates or a landmark's base, e.g.
  `/?view=city&dev&mindist=20&cam=1739,-3112,0,60,25` (the 10th Street park gate). Fog holds at
  its 150 m setting so nearby detail stays clear. Production builds ignore it.
- `/?view=models&v=cq400` opens a model in the Models view (the Model lab inside the app;
  `&dev` shows the photo overlay). `/models.html` still serves the lab on its own; new lab
  controls go in `web/src/models/lab-markup.ts`.
- `/vignette.html?at=<ISO>&weather=rain|fog|storm|overcast|clear&speed=600`, plus `?clean`
  and `?scatter`.

When a visual change is ready for Sam, open its finished view in the City coordinator’s
Orca worktree. Reuse one review tab. For landmarks, frame the building in daylight and
save the camera position with the screenshot. Each agent closes its research and test
tabs and stops its own dev servers after verification. Check with the other agents before
stopping a worker they share.

For ground contact (terrain showing through stairs, ballast, decks or covers), run
`pnpm audit:ground --url http://localhost:<port>` against a dev server. It audits the full board at
both tiers. In dev, `window.__setView(bearing, tilt, dist, x, z, zoom)` frames a close-up without a
reload. Lay ground-following layers on the drawn triangles with `terrain/drape.ts`, and give hard
surfaces a `GroundYield` for `GroundSurface.carve`, never a large constant lift.

Live MARTA appears only when the clock is the real present. Any shifted or sped-up clock
uses the timetable.

## Rules that matter

- **Honesty about data.** Every value carries a truth tier in the data: `live`,
  `scheduled`, `reported`, `inferred` or `illustrative`, per attribute, not per train.
  Show it where people would read something as fact. That means a selected train, bus,
  freight or traffic card, plus one scene-wide word (`Live` or `Timetable`). The Final subject card also names weather confidence (Sam, 2026-11-24). Don't label
  ambient scenery on screen: trees, building heights, landscaping or area notes.
  Those tiers live in Key and About. Freight is still `illustrative` on its card. Never
  present a schedule or a guess as live, and never show a guessed weather condition as
  real (decided by Sam on 2026-11-23; see `docs/data-model.md`).
- **Colour means the kind of service, not the agency.** City rail is blue, intercity is
  violet, and freight is rust. Agency line colours are accents only. Use generic look-alike
  liveries, never operator logos.
- **Free to host.** The site targets the Cloudflare free tier, and visitors pay nothing. No
  paid data feeds, and the worker cache keeps MARTA calls bounded. Flag anything that adds
  per-visitor server cost.
- **Secrets.** The MARTA key lives in 1Password (`op://Personal/sim-atlanta-marta-api/credential`)
  and in a Wrangler secret. The 511GA API key lives in
  `op://Personal/sim-atlanta-511ga-api/credential`; no code uses it yet. Never print, log,
  commit, or return either key in a response. `.dev.vars` and `.env*` are gitignored.
- **Art direction.** Landmarks should look real and functional, and stylisation rules make
  everything else feel good. Recolouring the same boxes is a colour treatment, not artwork.
  The chosen style (2026-11-20) follows a low-poly, ink-lined railway reference: leaf-clump
  tree canopies, thin silhouette ink, a colour grade and film grain, and tilt-shift. Vehicles
  are modelled in code from reference photos in the model lab (`/models.html`), with real
  livery colours but no operator logos. For every new landmark model or reskin, open a fresh
  Orca browser tab and consult daytime and nighttime exterior photographs. Compare the approach
  with another angle, link the sources, and identify estimated dimensions. Record the lighting
  visible in the photos and which details you estimated. If reliable night imagery is unavailable,
  document the gap. Check both daylight and full-night City renders from a matched camera.
- **Materials.** Landmarks pick materials from the library (`web/src/materials/`,
  `shell.paint(surfaces.brick(), ...)` or `prism(..., { wall: surfaces.stucco() })`) first.
  Add a new library material only when photos show something it can't cover. The library is
  procedural (no texture bytes), keeps the vertex colour as the mean, and fades detail with
  distance. A new texture anywhere in `web/src` must be declared in
  `web/src/materials/budget.ts`, which a test holds to a fixed budget. See `docs/materials.md`.
- **Build log.** After a meaningful step (a new data source, a visual milestone, a bug with a
  lesson), append a dated entry to `docs/build-log.md` with concrete numbers and what
  surprised you, and save a screenshot to `docs/log/`. Write it blog-ready.

## Working here

- Branch per task, and never commit to `main` directly. Orca runs each agent in its own
  worktree, so don't edit another worktree's files.
- CI (`.github/workflows/ci.yml`) runs `pnpm test:release` and the web type check and build on
  every pull request and push to `main`, so a separate fresh-clone run isn't needed. It has no
  GPU, so it skips the browser tests in `web/tests/` (`pnpm test` on a Mac runs them; run it
  there when you change City's camera, follow or board edges). It doesn't render the share
  previews or run `test:perf`, and it checks nothing visual. Its map data is cached until the
  pipeline changes, so it doesn't catch a new upstream feed; releases stage fresh data.
- Before a PR: run `pnpm test`, check visual changes in a browser, then run `pnpm review`.
  If the PR changes what City draws or loads, also run `pnpm test:perf`, and lower a ceiling when a cut reaches its target.

### Coordinating Studio work

- At kickoff, name one integration owner for each group of related changes. Contributors
  can build and review pieces in parallel. The owner brings them together on a feature
  branch, validates the combined result, and takes it through one PR to main when practical.
- The Studio coordinator keeps the current and next owner of the performance window in
  the release handoff. Claim the window before timing a browser run. While it is held,
  schedule other benchmarks and heavy builds or renders for later. Lightweight work can
  continue. Return the window with the tested commit and result, including a failed run.
- Keep one current handoff per active worktree. Use its Orca worktree comment, or point
  the comment at its existing handoff. Record the responsible owner, commit, next action,
  and link to test results or screenshots. Update it when ownership or status changes.
  After merge, preserve the evidence and check for unmerged work, local changes, and
  shared services before retiring the worktree.

## Review

`pnpm review` has the *other* model review this branch's diff against `origin/main`. Claude's
work goes to Codex and Codex's work goes to Claude, because a model misses the bugs it tends
to write. The reviewer reads only. The authoring agent triages the result under
[`docs/review-charter.md`](docs/review-charter.md): fix the confirmed findings and list the
plausible ones in the PR body. Stop after two rounds. The repo skill `cross-review` walks
through it.

These global review skills are also installed for both agents. Use them by name:
`architect-plan-review` before a multi-file plan, `product-design-plan-review` for plans
that change what users see, and `code-review` for a PR. Claude also has `design-audit` for
rendered UI.

<!-- review-bounds:start -->
**What counts as a review finding here.** Report only these:
1. A truth-tier lie: something shown as more certain than its source (a schedule as live,
   simulated freight without `illustrative`), or live data shown at a non-present clock.
2. Contract skew: pipeline output, `web/src/model/types.ts`, and the worker response
   disagree, or a stable id (`<feed>:<kind>:<name>`) changes.
3. Secret exposure: the MARTA key could reach a log, a response, the client bundle, or git.
4. Cost or deploy skew: per-visitor server work or uncached upstream calls, or a change
   that needs `pnpm data`, a rebuild of `web/dist`, or a redeploy without saying so.
5. Visual-only risk a diff cannot confirm. Naming "verify in a browser at <URL>" is itself
   the finding.
6. Correctness: wrong results on a concrete input (time zones, GTFS after-midnight times,
   geometry snapping), or deleting something a consumer still needs.

**Severity:** Blocking means wrong data shown, a secret exposed, or a broken build or
deploy. Significant means a silent failure, a test that passes with the fix reverted, or an
unnamed visual risk. Minor is everything else worth a line. Style is not a finding. Every
finding names the concrete input or state that makes it fire.
<!-- review-bounds:end -->
