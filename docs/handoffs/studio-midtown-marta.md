# Studio Midtown MARTA handoff to Claude Opus

**Hold #384 until the Air coordinator relays Sam’s OK.** This is the only open PR from this queue. It is ready for review on `samsolomon/robinson-empire-building`. Its last code commit is `6d5097a58f8a2c2bd6cb9e79656a961df519b9e2`, tested on main at `59b8cbc9` with both Peachtree landmarks. The subsequent handoff commit changes this document only. All implementation work is pushed.

## Sam’s request and review feedback

Sam’s request, quoted by the coordinator, was **“skin the remaining large/important buildings”**. The skyline lead assigned 230 Peachtree, 200 Peachtree and the J. Mack Robinson College building, one PR each. Sam said **“200 Peachtree looks okay to me.”** The coordinator requested a normal City orbit of about 300–500 m at 45–55° tilt, day and night, after Sam found the first 230 Peachtree angles hard to read. All three PRs include that pair. The coordinator flagged the 230 plaza sculpture and the dark 200 entrance canopy and roof as polish for later. Sam’s visual decision on Robinson is outstanding.

The current Air coordinator is `term_09e1b3da-5f48-4755-abf8-92a571a1f474`. Its exact instruction was **“Merge holds stay in force; nothing merges until I relay Sam's OK.”** Skyline confirmed this supersedes its earlier performance clearance. The outgoing Codex session is `orca_session_id:7abc46f1-296e-4e71-94c0-65df6427a6fa`. Read it for prior reviews, including the underpass handoff from predecessor `dd2c7465-6831-4447-b009-9e8aa68d6cf0`. Reply to coordinator message `msg_168b50a46fb9` using `orca orchestration reply --id msg_168b50a46fb9 --from <your session id> --body '...'`; direct Studio-to-Air sends previously hit a rejected pairing token. Use `orca orchestration check` for replies. Only the coordinator deploys.

## Verified PR state

| PR | State | Result |
|---|---|---|
| [#384](https://github.com/samsolomon/sim-atlanta/pull/384) | OPEN, ready for review | Robinson. Full suite and both performance tiers passed on the combined main base. Claude cross-review found no findings. |
| [#381](https://github.com/samsolomon/sim-atlanta/pull/381) | MERGED `59b8cbc9` | 200 Peachtree. On top of #377, high 1,189 draws / 105 programs and low 567 / 90. |
| [#377](https://github.com/samsolomon/sim-atlanta/pull/377) | MERGED `ad79062c` | 230 Peachtree. After batching #386, high 1,185 draws / 105 programs and low 565 / 90. |
| [#380](https://github.com/samsolomon/sim-atlanta/pull/380) | MERGED `bca71fa4` | Ground-contact’s shared underpass carries the five North Avenue spans, survey, clearance distinctions and cameras. The earlier draft [#361](https://github.com/samsolomon/sim-atlanta/pull/361) was closed as superseded. |
| [#372](https://github.com/samsolomon/sim-atlanta/pull/372) | MERGED `b6697d57` | King Memorial pier clearance regression. |

The three MARTA station entrances were already on main (#165, #169 and #174), and #339 fixed the Arts Center slab. The coordinator confirmed the entrance assignment was stale. We skipped the optional North Avenue escalator detail because the descending flight would require cutting the paving and terrain beneath the existing canopy.

## Robinson checks and cameras

The roof-camera comparison added 2,258 triangles and two draws on low. On the combined production board, high measured 1,193/1,250 draws, 105/140 programs and 500 MB after GC. Low measured 569/600 draws, **90/90 programs** and 393 MB after GC. Robinson and Davison’s share their compiled procedural material. Maintain the low program ceiling on any revision. The 1972 night street photograph documents nearby lighting, but the upper façade could not be verified at night. Lit office panes are illustrative. Web rebuild only.

Use November 20, 2026 at 11:30 and 23:30 Eastern, clear weather, speed zero and low quality. Append `&dev&mindist=20` for the close frontage. The camera fields are x, z, bearing, tilt and orbit distance.

| Building | Normal City view | Frontage | Roof |
|---|---|---|---|
| [Robinson captures and sources](../log/ui/empire-building/README.md) | `174,-134,75,48,440` | `144,-131,140,62,35` | `151,-133,60,31,255` |
| [200 Peachtree captures](../log/ui/200-peachtree/README.md) | `301,-568,312,49,420` | `346,-547,225,59,52` | `319,-557,310,35,345` |
| [230 Peachtree captures](../log/ui/230-peachtree/README.md) | `267,-677,292,48,455` | `351,-698,244,75,52` | `290,-687,290,25,470` |

## Next steps in order

1. Read `AGENTS.md`, fetch origin and check coordinator replies. Keep #384 open until the current Air coordinator relays Sam’s decision.
2. For a requested revision, update #384 on its branch and reshoot the matched views. Recheck the two light courts, the southern door in the three central Broad Street arches, and the neighboring Commerce Building. Run `pnpm test`, `pnpm --filter web exec tsc --noEmit`, the browser checks, `pnpm test:perf` and `pnpm review` for changed code. The full suite used the stable Rust toolchain on PATH and a temporary local `.venv` symlink to `../studio-midtown-skyline/.venv`, removed after testing.
3. On coordinator approval, check the PR head and the current base. If main has moved, rebase, retain both sides of appended build-log entries, and remeasure both tiers. After merging via the PR, run `gh pr view 384 --json state,mergeCommit`. Quote its exact state and SHA in the coordinator notice with screenshot links and the camera strings. Leave deployment to the coordinator.

At handoff the worktree had zero Orca browser tabs and no dev server listening on its review ports 5297 or 5298. The temporary merge worktree was removed.
