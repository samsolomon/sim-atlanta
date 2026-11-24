# Handoff: studio-midtown-culture (Claude → Codex), 2026-11-23

## State
- Every PR from this worktree is merged: #177 Mitchell House, #184 Varsity, #195 High (grid, ramp, atrium), #198 Sifly Piazza, #202 review sheets, #206 Woodruff rear, #209 High entry deck, #216 High Peachtree lawn, #244 lawn turf, #250 manicured cover, and the Woodruff service-side PR that adds this file (branch `samsolomon/woodruff-service`).
- The area docs are `docs/arts-campus.md`, `docs/varsity.md`, `docs/margaret-mitchell-house.md` and `docs/tech-campus.md`. Captioned before/after sheets are in `docs/log/ui/culture-review/README.md`.
- Code lives in `web/src/city/midtown-culture-*.ts`, `arts-campus.ts` and the fixtures in `web/src/city/fixtures/{arts-campus.json,midtown-culture/}`.

## Sam's decisions and intent (all 2026-11-23)
- Approved the Woodruff precast skin (fins, joints, slot windows). Reuse that approach for other large blank volumes.
- Every merge notice links captioned BEFORE|AFTER composites, one image per pair, with a caption and a ring or arrow on the subject. Money shot first, as GitHub blob links.
- Street View is approved for ground-level detail. View and cite it in an Orca tab; never copy the imagery into the repo.
- The High's lawn is a formal lawn, so it uses the `'manicured'` cover. The High's ginkgo mound stays mulch and does not get rich-black soil.
- Open question for Sam: the Varsity curb-canopy neon is lit at the present-day clock, which is illustrative because curb service ended in 2020. Darkening it is a one-line change if Sam wants that.

## Next, in order
1. **Rhodes Hall** (Peachtree), as a new landmark under the full AGENTS.md rule: day and night photos, a second angle, sources, dimensions, and matched day and full-night City shots at both tiers. Keep the low tier within `pnpm test:perf`. Research tabs from an earlier pass: georgiatrust.org/our-historic-sites/rhodes-hall, exploregeorgia rental PDF.
2. **SCAD Atlanta** on the south edge of the Brookwood campus.
3. **Tech Square with Coda** and its smokestack.
4. After each landmark lands, update its item in `docs/rectangle-detail-plan.md` (the coordinator asked for this).
5. Check every site lies inside x −1000..1800, z −5700..1100 and isn't already modelled (`git grep <osm id> web/src`).

## Promises to other agents
- **Tree agent** (orca_session_id:6b76e039-f4f6-472d-b827-e2a3fdf94a0a) owns the High ginkgo at (612.5, −4001.2) in `web/src/trees/sites.ts`. Inside its 9 m crown nothing may stand more than 1.5 m above grade, and a test pins this. The oak and magnolias are generic parks canopy, and the lamp belongs to the street-light layer, so don't model them.
- **Parks agent** (orca_session_id:eee32d1c-9a81-4fc4-b25f-64c0efd863df) owns the landscape primitives (`web/src/landscape/`). Use them; don't hand-roll one-offs.
- **Ground-contact agent** (orca_session_id:1df827bc-6e12-4e74-b7da-83ee8931ec4b) owns stair yields and carving in `peachtreeLawn` (#282). Message it before changing the stair or the turf cut there. Keep the stair's world coordinates and its 4 m width.

## Servers
- None left running by this session. `:5317` was the Vite dev server for this worktree (stopped), and `:5320` was a temporary main-branch "before" server (stopped, and its worktree removed).

## Repo rules that bit me
- **Formatting:** there is no Prettier config. Use `npx prettier --single-quote --print-width 120`, which matches the repo style; the defaults reformat whole files.
- **Toolchain:** cargo is not on PATH on the Studio. Prefix `PATH="/opt/homebrew/opt/rustup/bin:$PATH"` before `pnpm test`, and opencode is absent.
- **Shell:** zsh doesn't word-split `$VAR` lists. Use bash scripts or explicit loops.
- **Footprint edges:** the shell podium wall stands on the mapped footprint ring, which can sit metres outside a modelled face. Anything at street level must go on the ring edge, or it hides behind the podium (this happened with the loading dock).
- **Tests:** use `Box3.setFromObject(obj, true)` (precise). The default over-estimates under a rotated group. The museum landmark group's children are `[shell, landscape, turf]`, and the tests rely on that order.
- **City captures:**
  - The orbit minimum is 150 m, so use `window.__setView(bearing, tilt, dist, x, z, zoom)` for close-ups.
  - Hide the HUD with `.a2-subject,.a2-appbar,.a2-camera,.a2-hint,.a2-credit`, and wait until "Building the city…" disappears before a screenshot.
  - For a before build, `git worktree add` the base and run `pnpm install --offline` in it.
- **Merge conflicts:** `docs/build-log.md` conflicts on almost every merge. Resolve by keeping main's entries first, then yours.
- **Review:** `pnpm review` needs Codex, which was out of usage in this session, so these PRs got self-review with the code-review skill (one or two rounds) instead. Codex can run `pnpm review` normally.
