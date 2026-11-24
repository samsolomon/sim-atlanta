# Handoff: studio-midtown-parks (Claude, 2026-11-23)

Worktree `studio-midtown-parks`, which the coordinator calls "Midtown parks". This agent owns houses, yards, landscape primitives and furniture, Piedmont Park details and canopy staging. The full transcript is readable with `orca agent read`. This file covers what isn't obvious from it.

## Current state

- **Branch `samsolomon/studio-ansley-houses`:** pushed WIP, no PR yet. It is the coordinator-approved Ansley plan, item 1 (house forms):
  - `residential.ts`: an `ansleyForms()` pass on its own random stream (`id + ':ansley'`), so no other house changes. Its parts:
    - American Foursquares: about 45 % of eligible Ansley Colonials. Hipped roof, two storeys, a full-width porch with a white balustrade (balusters on high only) and one centre dormer.
    - Newer houses: about 30 % of Ansley Tudors. Limestone ashlar (siding style 12, `ashlar` family, about `#e4dccb`) or white-painted brick, under dark slate, with black steel window frames (the new `Plan.frame`).
    - Painted shingle: grey-blue and dark green added to the shingle family.
  - The lab has a new Houses → "Ansley Park forms" row and an ashlar row in the swatches.
  - Before/after captures of three cameras (`sam`, `pc`, `close`) at both tiers, day and night, were in progress in the scratchpad (`an/before`, `an/after`). Re-capture them; scratch is not durable.
  - **Still to do before its PR:**
    - compose the captioned BEFORE | AFTER images;
    - measure triangles (expected about +10k on high, +2k on low near houses; far houses unchanged);
    - write the README in `docs/log/ui/ansley-houses/`;
    - add a build-log entry;
    - run `pnpm test` and `pnpm build`;
    - self-review with the code-review skill;
    - **run `git diff --stat origin/main...HEAD` and confirm only your files appear.**
- **No open PRs.** Merged this session:
  - #286 yards;
  - #296 Active Oval;
  - #301 Piedmont furniture and the 10th Street gate;
  - #303 the `?dev&mindist` close camera;
  - #315 house level of detail (the phone-perf win);
  - #328 Ansley street widths.

## Sam's decisions and intent (all 2026-11-23)

- **Ground:** light and calm, "a whisper of variation". #248 is the standard.
- **Ansley character** (two photo batches, relayed by the coordinator):
  - wide streets (done in #328);
  - large houses with trees bigger than the houses;
  - terraced front yards with granite fieldstone walls and clipped hedges;
  - hex-paver sidewalks and granite curbs;
  - Winn Park's ravine floor is leaf litter with a dirt path, not lawn.
- **Street View:** allowed in a fresh Orca tab for the neighbourhood's feel, but never house by house. Record what you took in the doc. Everything stays illustrative or inferred, with no on-screen label, and within the low-tier budget.
- **Deferred:** utility poles and wires.
- **Phone performance is the top priority.** The A16 is triangle-bound. The low tier must stay lean, and new detail goes on high or into ground paint.

## Next steps, in order (the coordinator approved the plan: items 1 and 3 first)

1. Finish and ship the Ansley houses PR (above).
2. **Item 3, Winn Park:**
   - ravine floor: the `leaf-litter` ground cover plus a narrow `earth` path;
   - ivy and liriope on the banks;
   - a stacked fieldstone channel wall along the creek (`retainingEdge`, a granite colour variant);
   - a flagstone path and terrace with a bench (the furniture `bench`);
   - a small pond with a stone edge;
   - high tier about +4k triangles; low tier 0, via ground paint.

   Winn Park lies around x 790–900, z −4090…−4000 (Peachtree Circle, Westminster). Record the Street View notes in `docs/ansley-street-widths.md` (the "Street View notes" section) or a new Ansley doc.
3. **Item 2, terraced front yards** (high only, about 40–80 triangles per qualifying house). Where 3DEP rises more than about 0.8 m from the sidewalk to the house front: a fieldstone or limestone wall at the sidewalk, a clipped hedge on top, steps at the walk, and stone piers at some newer houses.
4. **Item 4, the street edge:** hex-paver sidewalks, granite curbs, liriope strips, continental crosswalks and The Prado's grass islands with yield signs. This is ground paint in `terrain/ground-map.ts`. **Ground-contact owns the ground maps, so coordinate first.**
5. If phone-perf asks: instanced house shells for heap, or freeing CPU-side attributes on far house tiles.

## Promises to other agents

- **Ground-contact** (`orca_session_id:1df827bc-6e12-4e74-b7da-83ee8931ec4b`):
  - measure the loose-hedge-clump fix with `pnpm audit:ground` now that #282 is in (the High's Peachtree lawn row, worst at about 612,−4008);
  - check one unclassified street's yards after #328 changed the yards' kerb to `roadWidth`;
  - coordinate on any ground-map paint (item 4).
- **Phone-perf** (`orca_session_id:3126b1a7-8882-498c-a5ff-7b65d626cf91`): answer if the A16 points back at houses, yards or landscape. Houses are tagged `userData.perf = 'buildings'`.
- **Materials** (`orca_session_id:2a079a0f-2573-4fe8-9648-2ec17e852466`): siding styles 11 and 12 (ashlar) were added for us. Tune coursing in `materials/siding.ts`, not in `world.ts`.
- **Tree lab:** owns tree species and placement, including the red Japanese maple on The Prado's islands. Don't place trees.

## Servers and ports

- Vite dev server on **:5417** from this worktree. It is stopped at handoff; start it with `npx vite --port 5417 --strictPort` in `web/`.
- There is no worker. The `/api` proxy errors to :8787 are expected and harmless.

## Repo rules that bit me

- **Never `git reset --soft` onto a stale `origin/main` to squash.** In #328 it produced a commit that would have reverted 83 files. Ground-contact caught it. Always `git fetch` first, and check `git diff --stat origin/main...HEAD` before every PR.
- **Build-log conflicts:** deleting the conflict markers can interleave entries. Check that your entry is intact after a rebase.
- **Capturing:**
  - Keep only one Orca tab open; a second tab throttles rendering and loads stall at "Building the city…".
  - Use a script that reloads and retries; the UI no longer has the "Frame" button the old capture script waited for.
  - After swapping files for BEFORE captures, wait for Vite to settle.
- **Ansley box:** `inAnsley` (house styles) starts at x 800. Peachtree Circle runs at x 770–835, so street logic uses `inAnsleyStreets` (x > 740).
- **Reviews:** Codex, opencode and Grok were unavailable to this Claude session, so reviews were self-reviews with the code-review skill, noted in each PR. Merge notices need GitHub blob links to captioned BEFORE | AFTER images, money shot first.
