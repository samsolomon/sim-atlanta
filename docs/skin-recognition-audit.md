# Skin recognition audit (2026-11-24)

## State of the skyline (2026-11-24, overnight)

61 landmark skins were audited against the test below: 44 skins plus 17 skyline and registry landmarks. 7 FAIL, 13 BORDERLINE and 41 PASS (Promenade Tower passes on its crown but has near-black glass). Rows are ordered by size on screen.

| Verdict | Building (PR) | Size | Owner | Status |
|---|---|---|---|---|
| FAIL | 100 Colony Square (#438) | large | skins-6 | Rework stacked on #554 |
| FIXED (pending train 8) | 400 Colony Square (#462) | large | skins-7 | Rework #554 v2 approved by lead: vertical stripes and 14th-floor band read at 420 m |
| FIXED (held for glass pick) | 1075 Peachtree (#416) | large | skins-4 | Rework #573 approved by lead; glass value waits for Sam (see glass-palette.md) |
| FAIL | Norfolk Southern HQ (#507) | large | skins-5 | Rework after Ansley |
| FAIL | JW Marriott Downtown (#522) | large | skins-4 | Rework queued, ahead of Rambler |
| FAIL | Marquis One (#393) | large | skins-1 | Rework under way, paired with Marquis Two |
| FAIL | Promenade Central (#164) | small–medium | lead | Untouched tonight (Sam-reviewed); listed for Sam |
| BORDERLINE | Marquis Two (#406) | large | skins-1 | In the Marquis rework |
| BORDERLINE | NCR HQ (#437) | large | skins-6 | Later pass |
| BORDERLINE | 271 Seventeenth (#451) | large | culture | Later pass |
| BORDERLINE | Loews Atlanta (#455) | large | skins-5 | Later pass |
| BORDERLINE | Winship (#487) | large | skins-7 | Later pass |
| BORDERLINE | The Landmark (#515) | large | skins-7 | Needs a 400–600 m shot |
| BORDERLINE | Tower Square (#188) | medium–large | lead | Later pass |
| FIXED (pending 8b) | Federal Reserve (#274) | medium | skins-6 | Rework #594 approved: paired windows between marble piers, photo-correct loggia; the slab is genuinely plain |
| BORDERLINE | Modera Parkside (#473) | medium | skins-2 | Later pass |
| BORDERLINE | SkyHouse South (#504) | medium | skins-3 | Later pass |
| BORDERLINE | Nine15 Midtown (#511) | medium | skins-3 | Later pass |
| PASS (plain, photo-backed; pending 8b) | 1072 West Peachtree (#445) | small | skins-6 | #604: photo-measured balcony slots; photos show a plain reflective shaft, identity is its height |
| BORDERLINE | Hard Rock Cafe building (#508) | small | skins-7 | Needs a 400–600 m shot |
| PASS, dark glass | Promenade Tower (#164) | medium | lead | Untouched tonight; listed in glass-palette.md for Sam |

Owners marked as a later pass are provisional: they're the original authors where known. Reworks are held PRs that the lead approves from each PR's original money-shot camera, and they ride normal trains.

The test: in the 400–600 m money shot, could someone who didn't know mistake the skin for the generic building beside it? If yes, it isn't finished.

**Scope and method.** This covers 44 merged skin PRs, #388–#525. Each was judged on the money shot already in its PR (the before/after composite where one exists, otherwise the after view against generic neighbours in the same frame). No new renders were made. The lead checked the three FAILs outside Colony Square (#393, #507, #522) by eye.

**Not covered yet.** The skyline-registry landmarks (1100 Peachtree, the Campanile, 1075, 1105 West Peachtree, 1010 Midtown, 1072 West Peachtree) and the early landmark models (#37–#366). Some PRs have only close-ups (#508, #515) or no composite, so those verdicts are weaker.

**Caution (coordinator, 2026-11-24):** recognition must come from the real building's features (rhythm, base, crown, material, massing), never from colour or contrast the photos do not support. Where the real building is a plain pale glass box, an accurate plain box at the right height is a PASS, and the audit says so explicitly. Strengthening passes start with #546 Azure and #527 Two Peachtree Pointe.

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

## Queued skins (train 8 candidates), checked before merge

Twelve skins queued before the recognition rule were judged from each PR's own images; the lead checked the FAIL by eye. Distances outside 400–600 m are noted, because they can flatter or understate a skin.

| Verdict | PR | Building | Note | Disposition |
|---|---|---|---|---|
| FAIL | #530 | Coca-Cola USA Building (large) | Red-brown granite reads as a beige punched grid at 620 m | Pulled from 8b; skins-7 reworks it |
| BORDERLINE | #527 | Two Peachtree Pointe (large) | Curved plan reads; glass and banding generic; no base or crown | Rides 8a; later pass |
| BORDERLINE | #539 | Renaissance Midtown (large) | Beige grid apart from the centre strip; frame is 300 m | Rides 8b; needs a 400–600 m frame; later pass |
| BORDERLINE | #528 | The M by Radius | Piers faint, crown hidden from that side | Rides 8a; later pass |
| BORDERLINE | #533 | Lilli Midtown | Grey glass near generic; base hidden; low-tier frame | Strengthen before 8c (lead approves) |
| BORDERLINE | #544 | Piedmont House | Blue among blue boxes at 750 m; faint grid | Strengthen before 8c (lead approves) |
| BORDERLINE | #529 | Vireo Piedmont Park | Balconies don't read at 700 m | Rides 8b; later pass |
| BORDERLINE | #537 | Hanover House | Tan box with one slot; grid doesn't read | Rides 8b; later pass |
| BORDERLINE | #546 | Azure on the Park | Tower glass matches neighbours | Rides 8b with #581's shade fix; later pass |
| PASS | #532, #536, #558 | Luxe, Crowne Plaza, Windsor | | 8b |
