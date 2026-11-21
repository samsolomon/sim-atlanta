# Railwatch (train-map) — Agent Guide

A free, fast map of where Atlanta's trains are, or are likely to be, right now. It is
becoming an art project: a real-time, low-poly 3D miniature of Metro Atlanta that starts
downtown (Five Points / the Gulch) and grows toward I-285. Pixel art is an optional render
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
pnpm test            # Rust + web + worker tests
pnpm build           # web/dist, which the worker serves
pnpm review          # cross-model review of this branch (see "Review")
```

## Seeing your work

Most changes here are visual, and tests can't tell you a scene looks right. After a UI or
scene change, run `pnpm dev` (plus `pnpm dev:worker` if you need live data), open the page in
a browser tool, and take a screenshot before you call it done. These URL options make views
reproducible:

- `?t=2026-11-20T14:00:00-05:00` pins the clock, and `?speed=30` plays time faster.
- `#zoom/lat/lon` sets the 2D map view, and `?view=3d` opens the downtown diorama.
- `/vignette.html?at=<ISO>&weather=rain|fog|storm|overcast|clear&speed=600`, plus `?clean`
  and `?scatter`.

Live MARTA appears only when the clock is the real present. Any shifted or sped-up clock
uses the timetable.

## Rules that matter

- **Honesty about data.** Every fact users see carries a truth tier: `live`, `scheduled`,
  `reported`, `inferred` or `illustrative`. Tiers apply per attribute, not per train.
  Freight positions are simulated and must say `illustrative`. Never present a schedule or a
  guess as live.
- **Colour means the kind of service, not the agency.** City rail is blue, intercity is
  violet, and freight is rust. Agency line colours are accents only. Use generic look-alike
  liveries, never operator logos.
- **Free to host.** The site targets the Cloudflare free tier, and visitors pay nothing. No
  paid data feeds, and the worker cache keeps MARTA calls bounded. Flag anything that adds
  per-visitor server cost.
- **Secrets.** The MARTA key lives in 1Password (`op://Personal/trains-marta-api/credential`)
  and in a Wrangler secret. Never print, log, commit, or return it in a response. `.dev.vars`
  and `.env*` are gitignored.
- **Art direction.** Landmarks should look real and functional, and stylisation rules make
  everything else feel good. Recolouring the same boxes is a colour treatment, not artwork.
- **Build log.** After a meaningful step (a new data source, a visual milestone, a bug with a
  lesson), append a dated entry to `docs/build-log.md` with concrete numbers and what
  surprised you, and save a screenshot to `docs/log/`. Write it blog-ready.

## Working here

- Branch per task, and never commit to `main` directly. Orca runs each agent in its own
  worktree, so don't edit another worktree's files.
- Before a PR: run `pnpm test`, check visual changes in a browser, then run `pnpm review`.

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
