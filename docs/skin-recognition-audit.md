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
| #393 | Marquis One | to assign (with Marquis Two #406) | Beige dense grid beside a generic beige-grid tower; only the crown step differs. |

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

## Skyline and registry landmarks (17 buildings in 16 PRs)

These were judged the same way. Only some PRs have a 400–600 m shot: Wimbish, the Academy, Ponce and the Fed are closer, and 1100, 1075 and 1072 are farther, so the reading at money-shot distance is estimated for those. Glass value is a point sample of the median HSV value from compressed PR screenshots, so treat it as approximate.

| Verdict | PR | Building | Why |
|---|---|---|---|
| FAIL | #416 | 1075 Peachtree (large) | Flat navy slab; brim, louvre crown and mullions don't register; sunlit glass about V 20 |
| FAIL | #164 | Promenade Central | Near-black box (V about 21), no base, crown or rhythm; close-up only |
| BORDERLINE | #188 | Tower Square | Strong white piers but flat generic roof, no base; glass V 24–26 |
| BORDERLINE | #274 | Federal Reserve | Cream regular grid close to generic beige at 500 m; tiers read only at 320 m |
| BORDERLINE | #445 | 1072 West Peachtree | At 1.5 km only slightly bluer than generic; crown and mullions only up close |
| PASS, dark glass | #164 | Promenade Tower | Stepped crown reads, but body near-black (V 16–18); Sam-reviewed, so no change tonight; listed in glass-palette.md |

Pass: Bank of America Plaza, One Atlantic Center (sunlit glass V 31), 1180 Peachtree, Georgian Terrace, Biltmore, Academy of Medicine, Wimbish House, Ponce de Leon Apartments, 1100 Peachtree, the Campanile, 1010 Midtown, 1105 West Peachtree (glass V 36 median, lifted by its braces).
