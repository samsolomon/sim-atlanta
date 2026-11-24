# Handoff: studio-tree-lab → GPT-6.2

Updated 2026-11-23 (America/New_York) by Codex session `48c0c9e4-ceda-4b87-adf1-6ada97d12390` at coordinator request `msg_4f8696001876`. Stop at this pushed WIP; successor continues on the same worktree. Read AGENTS.md and fetch first.

## Current state

Branch **`samsolomon/eastern-redbud-lab`** contains the unmerged first redbud lab study and this handoff. No redbud PR opened. Code, sheet and docs are committed together as WIP. The model is intentionally not an approved default or City rollout. All servers and tabs owned by this session are closed at handoff.

Three preceding tasks are approved and verified merged (`gh pr view --json state,mergeCommit`):

- Magnolia A3, **#345**, MERGED `f1f638b0a4714feb6d6f31c2098fe4cb82a3b194`: tidy upright lower skirt, warm-white specks; high A3 luminance +7.9% vs A, low +6.2%. `Look.preferred='A3'`, `tidySkirt` optional. Sheet `docs/log/ui/tree-species/options-magnolia-a3-pick.jpg`.
- Dogwood A round 2, **#352**, MERGED `ab68dea70208ff535920f8795edb03d8e560999d`: dense dome with three layers, low fork/curving limbs, daylight white bloom, inset top tips, finer horizontal winter mesh. 195/146 triangles. Sheet `options-dogwood-final-tidy.jpg` (before/after bloom/winter), full `options-flowering-dogwood-round-2.jpg`.
- White oak A, **#353**, MERGED `b1ad388f1e5287538268f255dea2e6d3a3b0677a`: Sam chose lobed cards, preferred A. 193/81 triangles plus bounded near tips. Winter residue stays crown-wide, documented with Sam's authorization to retain that limitation if localizing isn't cheap. Sheet `options-white-oak.jpg`.

Coordinator and tree-species received verified merge notices and API/cameras. Next City rollout is **elm A, dogwood A, magnolia A3, white oak A, willow oak A, water oak A**. Tree-species owns City integration, coordinator alone deploys.

## Current request and redbud WIP

Coordinator `msg_5ab24a940328`: rank 2–3 next species by recorded Ansley/Midtown observations and inventory, then start first, keep A-style cards. Proposal sent in one message (`msg_cf891ee46c13`):

1. Redbud: explicit pink tree in Westminster/Winn March Street View; TA 4.6% alive in-board plantings / 6.1% street strips/wells; GT 2.6%.
2. Callery/Bradford pear: C11 9.0% crown-squared / 4.5% stems. White-flowering Peachtree Circle ornamental remains unidentified, not pear evidence.
3. Chinese/lacebark elm: C11 5.7% crown-squared / 6.7% stems, TA 3.5%, Midtown Alliance specified. Less new value because current elm stands in for it.

River birch follows; holly/Leyland lack comparable quantified support. Five Ansley views are qualitative, not frequency counts; C11 excludes Midtown/Ansley. Full rationale in docs/tree-species.md.

Implemented in `web/src/trees/redbud.ts` and registries: four illustrative sizes, low vase, heart-shaped A cards, March pink / April leaves / October yellow / November bare. New `cordate` atlas shape in `foliage-kit.ts`, ninth atlas declared in materials budget (+1.33 MiB). No shaders or City placement changed. One option only: user asked A-style consistency, so looks.test.ts now permits 1–3 base options instead of requiring 2–3.

**The spring treatment needs work before promotion.** Existing bloom wash makes large pink hearts, whereas reference flowers trace bare branches. This is clearly documented and labelled on the sheet, not passed off as finished. Summer/winter skeleton is also a first pass (thin straight forks); compare the reference before claiming a characteristic redbud. Do not automatically merge or send to City as approved.

Sheet: `docs/log/ui/tree-species/options-eastern-redbud.jpg`, individual captures in `redbud/` next to it. Source photo: Dcrjsr, CC BY 3.0, NC State https://plants.ces.ncsu.edu/plants/cercis-canadensis/ . UF source https://ask.ifas.ufl.edu/publication/st145 . Sources support heart-shaped leaves, broad low vase, early pink bloom, yellow autumn and usual 20–30 ft height; nominal sizes/callipers/calendar are explicitly estimated/inferred. No night reference claimed.

185 high / 85 low triangles incl carpet, no tips. Summer Front high luminance/saturation .236/.808, low .260/.773 after lowLift −.015. Front camera `(0,3.15,23.4)` target `(0,3.15,0)`, FOV30; eye `(0,1.6,10)` target `(0,3.36,0)`, FOV58. URLs `/models.html?v=eastern-redbud&variant=A&size=mature&t=2026-03-22T12:00:00-04:00` for bloom; July1 summer, Oct28 fall, Jan15 winter, `tier=low`.

## Next steps

1. Send coordinator the pushed WIP sheet and honest spring limitation if needed; status at milestones. Resume redbud by making bloom follow wood within budget (consider optional geometry path, do not affect other species). Preserve A-style leaf cards. Review low fork against the reference.
2. Browser-check seasonal high/low, all four sizes and night, remeasure brightness, pnpm test and cross-review before PR. This WIP's two review rounds are complete; new substantive iteration may get its own review.
3. After Sam's eye, finish redbud on this task branch/PR. Pear then Chinese elm are proposed, not yet commanded builds. Supply looks API help to tree-species as needed.

## Validation at handoff

- `pnpm test` passes in `/tmp/redbud-picked-tests.log`. Initial failure was only the obsolete requirement for ≥2 options; fixed to allow 1. No weakened geometry budgets.
- `pnpm --dir web exec tsc --noEmit` passes, `/tmp/redbud-final-tsc.log`.
- Browser seasonal/sizes/eye/night/high/low captures taken and sheet inspected. Low-tier final capture `/tmp/redbud-low.log`.
- Claude cross-review twice, clean: `/tmp/redbud-review.log`, `/tmp/redbud-review-2.log`. Both explicitly call out documented draft bloom limitation.
- Python pipeline tests skip: repo `.venv` absent. Temporary `/tmp/tree-sheet-venv` is Pillow only, not pipeline environment. Existing generated-data bridge warnings are unrelated.
- No City perf run: City reads rollout-city registry, which this task does not modify.

## Coordination / tooling

Orca `/Applications/Orca.app/Contents/Resources/bin/orca`. Coordinator on Air `term_05a952fa-de06-4064-8655-3e98e1caf1e0`. `send --on air` failed pairing token; **reply works**:

`orca orchestration reply --id <message> --from orca_session_id:<your-session> --body '...'`

Coordinator model handoff: `msg_4f8696001876`; next-species task `msg_5ab24a940328`; whiteoak approval `msg_743b21013487`. Tree-species session `752c9656-15cc-4501-99e1-e59257d6fdcb`, reply target `msg_270a1481b510`. Check via `orca orchestration check`.

**Never announce MERGED without `gh pr view N --json state,mergeCommit` returning MERGED.** Main moves fast; keep BOTH entries in build-log conflicts and rerun tests. Only coordinator deploys. Remote review tab access was unavailable due pairing; send GitHub screenshot links and cameras.

Fresh GTFS is in `web/public/data/ga`. Brookwood historical-date failures were fixed by owner in #342; no action outstanding. Winn carpet overlap: owner coordinated with tree-species to suppress overlapping carpet discs only inside painted ravine; no tree-lab changes owed.

Capture scripts are temporary: `/tmp/capture-redbud.py`, `/tmp/capture-redbud-low.py`, `/tmp/sheet-redbud.py`; page IDs in them are closed, replace on reuse. Run Pillow script with `/tmp/tree-sheet-venv/bin/python`. Current own dev terminal `term_a26813c4-3023-4512-9c56-c85d8f04a64a` (:5833) and pages `65f8fc09-3ee5-4d7e-ae43-f3324bb0827c`, `9a3a0b70-78dd-4d24-80a9-9e0f120b41a7` are being closed for handoff. Earlier tree task tabs/servers already closed.
