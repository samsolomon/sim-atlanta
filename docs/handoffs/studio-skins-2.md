# Studio skins 2 handoff

## Paused on November 25, 2026

American Hotel product commit `6d84a23cd58d9d482aa963c1c608177d38122dcd` is on `samsolomon/american-hotel`. The build and targeted fixture passed, and the independent review found zero reportable issues. [Day, night, close-up and four-side views](../log/ui/american-hotel/) accompany the model.

The Studio waiter stopped before the full suite and matched performance runs. On resume, obtain the verified integration base and timing window before running those checks. Preserve the comparison checkout at `d93c51d8`.

Urban Life is parked on `samsolomon/urban-life-building` at `c135cf66552457a0f021fbe2bc87e55ea359014a`. Its next checks are the generic City baseline and the footprint and height fixture.


Sam asked to "skin the remaining large/important buildings". The Air coordinator now relays merge OKs (Sam delegated building skins to it); nothing merges without that OK. Send every status by replying to the coordinator's latest message with `orca orchestration reply`, including PR links, the blob URLs of the day, night and close images, the cam strings, and `pnpm test` and `test:perf` results for both tiers. Each PR body embeds the day and night images side by side, plus the close view, with the cam string under each.

## Done

| Building | PR | State |
|---|---|---|
| 171 Seventeenth | [#388](https://github.com/samsolomon/sim-atlanta/pull/388) | Merged `670d0bf4` after the crown and stone-base revision |
| 903 Peachtree | [#392](https://github.com/samsolomon/sim-atlanta/pull/392) | Merged `c88fbbbb` after the residential night-window revision |

## In flight

1. **999 Peachtree** (`samsolomon/999-peachtree`): central blue curtain wall between pale stone wings, recessed Peachtree entrance, no crown lighting because no night photo was found. Review cam `782,-3018,70,50,520`, close `716,-3026,80,60,240`, day 11:30 and night 23:30. See `docs/log/ui/999-peachtree/README.md`.
2. **10 10th** (`samsolomon/10-10th`, WIP): brick shaft with a silver ribbon-window bay at the southeast corner, two silver top floors, a two-storey podium along 10th and a penthouse. Height comes from the 2019 lidar (64.6 m roof, 68.4 m penthouse), not the inferred parts. The start cam `414,-3104,32,60,300` is blocked by neighbouring towers, so use `414,-3104,325,48,420`.
3. Then the overnight queue rows in `docs/building-skins.md` on `samsolomon/studio-building-skins`: Nomia, The Proscenium, Hanover Midtown, and Sora at Spring Quarter. Follow the building names; the rank numbers change.

## Rules and checks

- Use `landmarkShell` and vertex colours only. Add no painted surfaces or new material variants. On main `bab9d038`, low is at 85/90 programs and high at 100/140.
- Night windows follow the building type: offices mostly dark at 23:00–23:30, residential and hotel buildings noticeably lit (903 uses 0.32). Crowns and glass get clean, even surfaces, with no speckle.
- Every PR edits the same dispatch in `web/src/terrain/model.ts` and appends to `docs/build-log.md`. When rebasing, keep both dispatch arms and both log entries.
- Run `pnpm test` and `pnpm test:perf` one after the other. Running them at the same time makes the east-rail test time out. Main moves often: rebase, rerun, and merge right away. If only unrelated PRs land during the run, rebase once more and merge.
- Before capturing, wait until `window.__cityDev.areaCount()` returns 12 and "Building the city" has cleared, then wait about 14 s more for textures to finish uploading. Take every final shot from a fresh `cam=` URL load.
