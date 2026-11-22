# Avondale station layout (MARTA E7), source fixture (2026-11-22)

Avondale is the second worked example for the shared platform primitive
(`web/src/model/platforms.ts`, owned by Marlin), after Georgia State. It has four tracks and two
island platforms. The fixture lives in `web/src/model/avondale-layout.ts`, and its tests are in
`avondale-layout.test.ts`. It is data only: it adds no City board and no arrivals.

The fixture keeps three things separate, because each comes from a different source:

| What | Fixture | Tier | Source |
|---|---|---|---|
| Which track faces which platform edge | `AVONDALE_LAYOUT` | physical fact | OSM, checked against imagery and photos |
| Which platform a scheduled pattern calls at | `AVONDALE_SERVICE[].platform` | scheduled | GTFS `stop_id` |
| Which track a given trip uses | `candidates` (all physically possible) and `usual` | the usual track is inferred or reported; **per trip, unknown** | Nothing public gives it per trip |

## Physical layout

The reference axis is eastbound, toward Kensington and Indian Creek, at a bearing of about 67.5°.
`side` gives the platform's side of a track when facing eastbound; travel −1 swaps it. Offsets
`v` are lateral, positive to the south, measured from the station node
[osm:node/4172458457](https://www.openstreetmap.org/node/4172458457).

| North → south | OSM | v (m) | Boarding edge |
|---|---|---|---|
| **EL**, westbound main | [way 40894429](https://www.openstreetmap.org/way/40894429) (`usage=main`) | −13.5 | north island, `right` |
| North island platform, GTFS stop **908691** | [way 78044271](https://www.openstreetmap.org/way/78044271) | −11.6 to −4.0 | 180 m long, 7.6 m wide |
| **WB**, centre track | ways 905946827, 905879577 (`service=yard`) | −2.2 | north island, `left` |
| **EB**, centre track | ways 905946828, 905879576 (`service=yard`) | +2.2 | south island, `right` |
| South island platform, GTFS stop **908438** | [way 78044272](https://www.openstreetmap.org/way/78044272) | +3.9 to +11.8 | 181 m long, 7.9 m wide |
| **ER**, eastbound main | [way 24850628](https://www.openstreetmap.org/way/24850628) (`usage=main`) | +13.5 | south island, `left` |

- **Platform refs:** the platforms' OSM `ref` tags are the GTFS stop ids (908691 and 908438). They
  are members of stop area [relation 4439497](https://www.openstreetmap.org/relation/4439497).
- **Edge clearance:** every boarding edge is 1.8–1.9 m from its track centre, which is plausible
  for MARTA cars. Unlike Georgia State, these edges can be used as drawn.
- **Centre tracks:** they reach the mains through the *Avondale Crossover* (ways 78044276 and
  78044278), 110–180 m west. To the east they run into Avondale Yard
  ([way 171606146](https://www.openstreetmap.org/way/171606146)).
- **Imagery:** in Esri World Imagery, the two long canopy roofs and the outer track beds sit on the
  OSM lines within about 3 m. The imagery was viewed only; it is not committed.
- **Photos:** two Wikimedia Commons photos (Gman197002, 2015-09-07, CC BY-SA 4.0), linked here and
  not committed.
  - [MARTA Avondale Station.JPG](https://commons.wikimedia.org/wiki/File:MARTA_Avondale_Station.JPG)
    is taken from an island platform. It shows the two centre tracks between the islands, under
    deep canopies.
  - [Eastbound from MARTA Avondale Station.JPG](https://commons.wikimedia.org/wiki/File:Eastbound_from_MARTA_Avondale_Station.JPG)
    shows the tracks fanning out east of the station, with a sign: "Reminder: contact RSCC for
    routing into yard".
- **Station layout:** Wikipedia's
  [Avondale station (MARTA)](https://en.wikipedia.org/wiki/Avondale_station_(MARTA)) is thinly
  cited. It gives "2 island platforms, 4 tracks" and "doors will open on the left" for both
  through directions. The fixture's door rule reproduces that.

## Service

| Pattern | In the current feed? | Platform (tier) | Candidate tracks | Usual track (tier) |
|---|---|---|---|---|
| Blue eastbound, through | yes | 908438, south island (scheduled) | ER, EB | ER (inferred) |
| Blue westbound, through | yes | 908691, north island (scheduled) | EL, WB | EL (inferred) |
| Green limited service, terminating | **no** | 908438 (reported) | ER, EB | EB (reported) |
| Green limited service, originating | **no** | 908691 (reported) | EL, WB | WB (reported) |

**Blue through service.**
- In the staged MARTA GTFS (service 2026-08-22 to 2026-12-11), every call at Avondale is a Blue
  through trip: 646 eastbound at 908438 and 632 westbound at 908691. No trip starts or ends there. A test
  enforces this against the staged timetable.
- The usual track is the main. Wikipedia says the centre tracks "are not normally used for
  through service", and OSM tags the mains `usage=main` and the centre tracks `service=yard`.
- That is still an inference. A Blue train can be routed through a centre track, for example to
  or from the yard, and nothing public says which trips are.

**Green turnbacks.**
- OSM route relations [12300720](https://www.openstreetmap.org/relation/12300720) and
  [12300721](https://www.openstreetmap.org/relation/12300721) ("Bankhead ⇄ Avondale") arrive on EB
  (`stop_exit_only` node 8413044626) and leave on WB (`stop_entry_only` node 8413044625).
  Wikipedia describes them as limited service.
- The current feed has no such trips. MARTA's own
  [Avondale page](https://www.itsmarta.com/Avondale.aspx), read 2026-11-22, lists only the Blue
  Line among its rail routes.
- These patterns are recorded as `reported` with `inCurrentFeed: false`, and must not be drawn as
  scheduled.

## Not established

- The per-trip track for any train.
- Which centre track a yard move or a turnback uses on a given day.
- Platform heights and canopy extents. OSM has no canopy ways here, and the imagery shows roofs
  over most of both islands.
- Exact stopping positions.
