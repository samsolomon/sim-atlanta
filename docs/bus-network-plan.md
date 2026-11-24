# Bus network plan

Written 2026-11-23 for Sam to choose from. Nothing here is built yet. It builds on Route 49
(#368), which this plan treats as the template: a pinned GTFS slice per route, timetable buses
at shifted clocks, and GPS steering with a per-trip timetable fallback at the present.

## 1. MARTA routes that cross the board

Source: the pinned MARTA GTFS edition (archive SHA-256 `f4a36309…`, service through
2026-12-11), weekday service `5`. The board is the 12-area rectangle from x −1000 to 1800 m and
z −5700 to 1100 m around Five Points (`web/src/square-board/sections.ts`). A route counts when
any trip's **shape** enters the board. A stop-based count gives the same list, so no route only
passes through. **17 of the feed's 81 bus routes enter the board.**

"On board" time and the peak are estimated by spreading each trip's scheduled run time evenly
along its shape. That is good to about ±1 bus.

| Route | Name | Weekday trips | AM peak trips/h (7–9) | Midday trips/h | Min on board per trip | Km of route on board | Peak buses on board |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | Donald Lee Hollowell / Ponce de Leon | 216 | 12 | 11.5 | 9.8 | 3.4 | 4 |
| A | Rapid A Line | 200 | 12 | 10 | 5.0 | 1.9 | 2 |
| 20 | South DeKalb / Downtown | 142 | 8 | 8 | 6.3 | 4.9 | 2 |
| 51 | Joseph E. Boone / Ralph McGill | 124 | 6 | 6 | 7.3 | 2.9 | 2 |
| 23 | Peachtree Road / Buckhead | 120 | 6 | 6 | 7.5 | 2.6 | 2 |
| 1 | Joseph E. Lowery / 17th St | 116 | 6 | 6 | 6.0 | 2.3 | 2 |
| **49** | McDonough Blvd / Hill St (**built**, #368) | 113 | 6 | 6 | 12.1 | 5.0 | 2 |
| 55 | Jonesboro Road | 92 | 6 | 4 | 5.2 | 3.1 | 2 |
| 7 | Boulevard / McDonough Blvd | 80 | 4 | 4 | 6.1 | 2.4 | 2 |
| 42 | McDaniel St / Pryor Rd | 80 | 4 | 4 | 6.6 | 4.0 | 2 |
| 14 | Blandtown / Hightower Rd | 80 | 4 | 4 | 3.8 | 1.6 | 1 |
| 10 | AUC / Hollywood Rd | 79 | 4 | 4 | 8.8 | 3.5 | 2 |
| 12 | Howell Mill Rd | 78 | 4 | 4 | 3.9 | 1.6 | 1 |
| 22 | Glenwood | 78 | 4 | 4 | 8.6 | 5.7 | 2 |
| 3 | Martin Luther King Jr Dr | 77 | 4 | 4 | 9.2 | 3.3 | 2 |
| 11 | Defoor Ave / Virginia Highland | 77 | 4 | 4 | 9.6 | 3.3 | 2 |
| 21 | Memorial Drive ITP | 75 | 4 | 4 | 9.2 | 5.7 | 2 |

**All 17 together peak at about 24 buses on the board, around 17:30.** That is well inside
City's 64-instance bus batch.

### Phone cost per route

Each extra route costs roughly the following. The estimates come from Route 49's measured
numbers, tonight's queue benchmark (`docs/build-log.md`, 2026-11-23) and the #368 perf runs.

- **Draw calls: none.** Every bus, live or timetable, is an instance of the one XN40 mesh and
  material. A route adds no shader programs. Low is at 85/90 programs.
- **Triangles:** 616 per low-tier XN40. A route peaking at 2 buses adds about 1.2k. All 17 at
  peak add about 15k, against a low ceiling of 2.6M (2.38M measured).
- **CPU per frame:** about 0.01 ms per drawn bus for the car-queue interaction (64 buses: queue
  mean 0.66 ms, p95 1.0 ms on the Studio), plus about 0.0015 ms per bus to steer or place it.
  On the A16, assume 5–8×. All 17 routes at peak would be about 0.25 ms on the Studio, roughly
  1.5–2 ms on the phone.
- **Load:** Route 49's pinned slice is 116 KB of JSON (658 trips, 2 shapes, 27,632 calls), and
  scales with trips × stops. Each directed shape samples lane anchors every 3 m on the board at
  City start. A typical route is 2–6 km on the board, so roughly 1,000–4,000 lane lookups.
  Route 2 (216 trips) would be about 200–250 KB before gzip.
- **Network:** zero. `/api/marta/bus` already carries every MARTA vehicle with its trip
  descriptor. More routes change only which fixes City steers.

**Suggested order:**
- **2** (busiest, Ponce through Midtown, 4 on board at peak).
- **23** (the Peachtree spine through Midtown and Downtown).
- **A Line**, which wears the purple Rapid livery the lab already has on the XN40.
- **20**, **51** and **1**.

The remaining 4/h routes add little motion per kilobyte.

## 2. Articulated buses

Short answer: **no MARTA route verifiably runs articulated buses today.** The XE60 model in the
lab is ready, but nothing should put it on a route yet.

- **Rapid A Line** (Capitol Ave, Downtown to Capitol Gateway, opened 2026-04-18) runs **40-ft
  CNG buses in purple Rapid branding**, not articulated ones. MARTA's Phase One page says the
  New Flyer battery-electric fleet bought for the line was hit by a battery recall.
  ([MARTA Phase One](https://itsmarta.com/marta-rapid-a-line-phase-one.aspx),
  [AJC](https://www.ajc.com/news/2026/04/are-you-a-marta-bus-if-not-get-out-of-the-new-rapid-a-lines-red-lanes/))
  The roster in `docs/marta-rapid-buses.md` identifies 7108 and 7112 as 2025 New Flyer XN40s.
- MARTA's A Line overview still promises "Brand-new 60' articulated electric buses" with "final
  revenue service" in Fall 2026 ([summerhill](https://itsmarta.com/summerhill.aspx)). **Unverified:**
  that any 60-ft bus has entered service as of 2026-11-23.
- **Make and model:** sources name about six New Flyer battery-electric 60-ft buses within a
  198-bus order ([Metro Magazine](https://www.metro-magazine.com/news/marta-board-approves-slate-of-projects)).
  **Unverified:** the exact designation (XE60 or otherwise).
- **Campbellton Rd and Clayton Southlake Rapid** are planned with 60-ft battery-electric buses.
  **Unverified** in a MARTA primary source. Neither crosses the board.

**Does the lab XE60 fit?** Dimensionally, yes. It's 18.54 m long, 2.6 m wide and 3.3 m tall,
with an articulation limit of about 35° (estimated), and it's at most 1,500 triangles at low.
For City it is **not free**:
- It uses its own material and depth material for the bend, which is about 2 new shader programs.
- It has a two-body pose, so it needs a joint-aware path follower, not the XN40's rigid one.
- Low has 5 programs of headroom after #391. That's enough, but it is most of what's left.

**Recommendation:** put the A Line in City on the XN40 with `xn40Rapid` livery now. Add the
XE60 only when MARTA confirms 60-ft service, and then only at high, or after a program budget
review.

## 3. ATL Xpress coaches

These findings come from a research pass on 2026-11-23. The URLs are inline, and the
unverified items are labelled.

- **Static GTFS is free, but it has expired.** [gamobility.info](https://gamobility.info/) links
  `google_transit.zip` (`feed_version` S1000112). Downloading it needs a browser Referer header.
  Its `calendar.txt` runs **2025-09-15 to 2026-09-18**, so it schedules no service today. No
  newer feed was found.
- **Licence: unverified.** Transitland lists CC-BY-4.0 with attribution required
  ([dmfr](https://github.com/transitland/transitland-atlas/blob/main/feeds/xpressga.com.dmfr.json)).
  The ARC page it cites is now 404, and ATL's ArcGIS item has no licence field. Confirm with
  ATL before shipping. Until then, attribute "Atlanta-Region Transit Link Authority (Xpress)".
- **GTFS-realtime: free, no key.** `https://myxpress2.xpressga.com/gtfsrt/{vehicles,trips,alerts}`
  returned protobuf. Trip updates carried 2026-11-24 trips whose IDs follow the static format.
  **Terms: unverified.**
- **Routes on the board.** These are derived from the expired feed's stops:
  - The Downtown and Midtown loop is served by 419, 426, 430, 441, 463 and 476.
  - 411, 413 and 416 serve Downtown only.
  - 412, 414 and 484 serve Midtown only. Midtown stops include Civic Center, North Ave, Arts
    Center and West Peachtree.
  - The Gwinnett routes (411–416) match the I-85 Express Lanes, and 484 matches the I-75/I-575
    Northwest Corridor lanes. 430 and 441 match the I-75 South lanes.
  - **Unverified:** each route's lane use and its path along the Downtown Connector. The
    feed's `shapes.txt` can settle that.
- **Vehicles.** SRTA ordered 77 MCI D4500 and 15 MCI D45 CRT LE coaches in 2019
  ([Mass Transit](https://www.masstransitmag.com/bus/vehicles/press-release/21083739/motor-coach-industries-mci-state-road-and-tollway-authority-orders-77-mci-vehicles-for-commuter-and-transit-operations)).
  The vehicles agent is modelling the coach.
- **Truth tier.** A coach drawn from the static timetable would be `scheduled` on position
  timing and `inferred` on its drawn place, the same as Route 49 timetable buses. **With the
  current feed expired, nothing may be shown as Scheduled for today.** Showing an expired
  timetable as today's service would be a truth-tier lie. The options are:
  - (a) wait for or request a current feed;
  - (b) use the realtime feed (`live`). This needs a new worker upstream and cache, so it's
    flagged for free-tier cost, and its terms are unverified;
  - (c) draw clearly illustrative coaches on the express lanes, labelled `illustrative`, with
    no times.

## 4. The queue hitch before scaling

The 56.6 ms frame came from one lane replaying 2,352 half-second steps in a single draw. #378
fixed it by capping replay at 64 historical steps per draw.

Tonight's three-run benchmark (Studio, 2,700 frames at 30 Hz, 64 buses) measured these worst
frames:
- 6.4 ms worst, 1.9 ms p99 for 64 timetable buses;
- 5.3 ms worst, 1.2 ms p99 for 64 GPS buses.

A separate 26 ms hourly frame on the present-clock path, from planning all of the hour's trip
timelines at once, is fixed in #368 (now 0.4 ms).

What remains before adding routes:
1. **Measure the real mix, not 64 copies of one route.** Benchmark all 17 routes' trips
   at 17:30 (about 24 buses), at live and shifted clocks. Gate on Studio queue p99 ≤ 2 ms and
   worst ≤ 8 ms, and on a coordinator A16 run.
2. **Spread replay.** The remaining worst frames are rollovers in which several lanes replay
   their 64-step cap in the same draw. Stagger lane replays across frames, at most N lanes per
   draw, so the worst frame doesn't grow with route count.
3. **Plan timelines per route lazily.** Plan each route's trips in the hour ahead incrementally,
   as #368 now does for Route 49, so that 17 routes don't multiply the hourly planning cost.
4. **Keep one bus batch.** Stay at ≤ 64 instances with tracked buses prioritised (#368 already
   reserves slots). Revisit only if a peak count approaches about 50.

## 5. GTFS refresh routine

The current edition ends **2026-12-11**. Route 49's release checklist says to refresh on or
before **2026-11-27**.

1. **Weekly check (proposed: Mondays).** Request `https://itsmarta.com/google_transit_feed/google_transit.zip`
   with `If-Modified-Since` or the ETag, and record `feed_info` and calendar ranges. Doing this
   by hand or in a scheduled job is fine. No visitor traffic is involved.
2. **On a new edition.** Run `pnpm data:bus49 /path/to/google_transit.zip`. The exporter checks
   the archive hash. Update the pinned SHA-256 and provenance, and diff the new
   `web/public/data/ga/bus-49.json` against `pipeline/prototypes/bus-49/timetable.json`
   (trips, shapes, services and trip-ID alignment). Then run the contract tests, `pnpm test`
   and a timetable/GPS spot check at the present.
3. **Expiry guard.** Add a test that fails when the staged calendar ends within 14 days of the
   build date. Then a stale edition can't ship silently, and the City Key's service-date note
   stays honest.
4. **Multi-route.** When more routes land, export them from the same archive in one step, so
   every route shares one edition and one expiry.
5. **Owner.** The coordinator or Studio connector agent runs step 1 weekly. Any agent can run
   steps 2–3, through a normal PR held for Sam.
