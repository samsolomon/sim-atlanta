# Skin recognition audit (2026-11-24)

The test: in the 400–600 m money shot, could someone who didn't know mistake the skin for the generic building beside it? If yes, it isn't finished.

**Scope and method.** This covers 44 merged skin PRs, #388–#525. Each was judged on the money shot already in its PR (the before/after composite where one exists, otherwise the after view against generic neighbours in the same frame). No new renders were made. The lead checked the three FAILs outside Colony Square (#393, #507, #522) by eye.

**Not covered yet.** The skyline-registry landmarks (1100 Peachtree, the Campanile, 1075, 1105 West Peachtree, 1010 Midtown, 1072 West Peachtree) and the early landmark models (#37–#366). Some PRs have only close-ups (#508, #515) or no composite, so those verdicts are weaker.

## FAIL (rework before new rows), by size on screen
| PR | Building | Owner | Why |
|---|---|---|---|
| #438 | 100 Colony Square | skins-6 (rework) | Pale blue-grey glass, faint bands; reads as generic. Rework in progress. |
| #462 | 400 Colony Square | skins-7 (rework) | Horizontal bands only; no vertical rhythm, base or crown. Rework in progress. |
| #507 | Norfolk Southern HQ | skins-5 | After is nearly identical to before: generic blue glass boxes, no rhythm, crown or colour shift. |
| #522 | JW Marriott Downtown | skins-4 | Pale blue-grey like its neighbours; balcony stacks too faint at distance; no crown. |
| #393 | Marquis One | skins-1 | Beige dense grid beside a generic beige-grid tower; only the crown step differs. |

## BORDERLINE, by size on screen
| PR | Building | Why |
|---|---|---|
| #406 | Marquis Two | Dark dense grid reads as texture; crown step faint; no vertical rhythm |
| #437 | NCR HQ | West tower glass is generic pale blue without mullions |
| #451 | 271 Seventeenth | Dark box, no base or crown |
| #455 | Loews Atlanta | Glass is the generic pale blue; only the stone base helps |
| #487 | Winship | Tower glass near generic; no crown (oculus canopy is good) |
| #515 | The Landmark | Close-up only; base and crown not shown at distance |
| #473 | Modera Parkside | Glass slightly darker than generic; flat crown |
| #504 | SkyHouse South | Pale mint grid close to generic beige; no signature crown |
| #511 | Nine15 Midtown | No distinct base or crown; white face near generic |
| #508 | Hard Rock Cafe building | Close-up only; beige punched grid likely generic at distance |

The other 29 PRs pass. #414 Emmi and #448 Hanover Midtown pass on glass colour and mullions but have no distinct crown.
