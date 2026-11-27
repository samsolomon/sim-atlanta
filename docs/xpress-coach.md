# Xpress highway commuter coach

Sam asked on November 23, 2026 for a model of the express-lane commuter coaches. They run on the Downtown Connector and the I-75/I-85 express lanes. The Model Lab entry is `xpressCoach`. City placement waits on the bus-network plan.

## Fleet identification

- **Operator.** ATL Xpress is operated by the State Road and Tollway Authority, which has run GRTA's Xpress service jointly since 2017.
- **2019 order.** SRTA ordered 77 MCI D4500 commuter coaches and 15 all-accessible MCI D45 CRT LE coaches. Deliveries ran from August 2019 to early 2020. The release says 164 D4500s were already in operation. [Mass Transit, 2019](https://www.masstransitmag.com/bus/vehicles/press-release/21083739/motor-coach-industries-mci-state-road-and-tollway-authority-orders-77-mci-vehicles-for-commuter-and-transit-operations) · [BusRide](https://busride.com/georgias-xpress-transit-orders-77-mci-d4500-and-15-all-accessible-mci-d45-crt-le-commuter-coaches/)
- **Current fleet.** An ATL committee deck from December 2023 lists 165 buses, all 45-foot commuter coaches, with 10 battery-electric coaches on order. [Xpress Operations Committee](https://atltransit.ga.gov/wp-content/uploads/2023/12/Xpress-Operations-Committee.pdf)
- **Modelled type.** Pass 1 followed the D45 CRT LE. On review, Sam switched it to the **MCI D4500**, the fleet majority (77 of the 2019 order against 15 LEs). The D4500 has a single front door and no mid or rear passenger door. Its wheelchair lift sits behind a flush curb-side panel, shown as seams only. The model does not say which type any given trip uses.

## Photographs

| Photo | Date | View | Licence |
| --- | --- | --- | --- |
| [Xpress 2113, Peachtree Center](https://commons.wikimedia.org/wiki/File:GRTA_Xpress_bus_2113_2024-09-05.jpg) | Sept 5, 2024, 16:47 | ¾ front, curb side (D45 CRT LE) | CC BY 4.0, ElToAn123 |
| [Xpress 1924, Spring Street](https://commons.wikimedia.org/wiki/File:Xpress_Bus_1924_2024-10-18.jpg) | Oct 18, 2024, dusk | ¾ front, street side (D4500) | CC BY-SA 4.0, ElToAn123 |
| [MTA D45 CRT LE 0023, Madison Avenue](https://commons.wikimedia.org/wiki/File:54th_St_Madison_Av_td_(2018-08-16)_05_-_MCI_D45_CRT_LE.jpg) | Aug 16, 2018 | ¾ front, curb side: door layout and windshield | CC BY-SA 4.0, Tdorante10 |
| [MTA D4500 3473](https://commons.wikimedia.org/wiki/File:MTA_MCI_D4500_3473.jpg) | Jan 26, 2023 | ¾ rear: engine door louvres, tail lamps | CC BY-SA 4.0, Kidfly182 |

**Night.** Xpress 1924 is at dusk with headlights lit. No reliable full-night photo of an Xpress coach was found. Night lighting is estimated: white headlight bars, a glowing destination sign, lit passenger windows and red tail lamps.

## Dimensions

**D4500 sources.** The [MCI D-Series commuter spec sheet](https://www.mcicoach.com/site-content/uploads/2023/01/MCI-D-Series-Commuter-Specs.pdf) (2021) and [CPTDB](https://cptdb.ca/wiki/index.php/Motor_Coach_Industries_D4500CT) agree on:
- 13.84 m long;
- 2.59 m wide;
- 3.48 m high;
- an 8.08 m (318 in) wheelbase;
- overhangs of 1.93 m (75.9 in) front and 2.68 m (105.6 in) rear.

Those figures leave 1.15 m between the drive and tag axles. The body roof is modelled at 3.36 m, and a low roof pod brings the coach to the 3.48 m spec height.

**Estimated from the photos:**
- the 2.02 m window belt and 3.12 m window head;
- the windshield rake (0.42 m set-back);
- the size of the lift panel and the luggage bays;
- the shape of the livery sails;
- the sizes of the roof pod and hatches;
- the rear engine-door louvres and the upper intake grille. The coach has no rear window.

**Compared with the city XN40.** The XN40 is modelled at 12.5 × 2.6 m, 3.02 m to its body roof and 3.38 m over its CNG pods. The coach is 1.3 m longer and has a third axle. Its body roof sits 34 cm higher and its window band about 0.8 m higher. Overall it is only 10 cm taller, because the XN40's CNG pods sit on its roof. [Side-by-side](log/xpress-coach/scale-vs-xn40.jpg)

## Livery

These are look-alike colours from coaches 2113 and 1924:

| Element | Colour |
| --- | --- |
| Body | Silver-grey |
| Window band | Black |
| Lower skirt | Darker grey |
| Sails ahead of the drive axle | Navy, blue and pale-blue triangles |
| Front fascia | Dark |

There are no wordmarks, logos, Wi-Fi marks or fleet numbers. The destination sign is a plain amber glow.

## Budget

- **Material.** It uses the shared `busMaterial` (program key `xcelsior`), so it adds no shader program. Pass 2 added light kind 5 to that shader for tinted coach glass, a dim interior glow, without adding a program.
- **Triangles, measured:** 4,100 high and 986 low, against 6,140 for the XN40. Low detail drops rim lips, hub rings, the hidden inner duals, window pillars, the skirt, louvre slats, the pod grille and the amber rear lamps.
- **Phone FPS:** not measured.

## Review passes

- **Pass 1** (LE) was reviewed by Sam and the coordinator on November 23, 2026.
- **Pass 2** made these changes:
  - switched to the D4500 with a high deck, a continuous band and three luggage bays each side;
  - a tall raked windshield under a rounded cap;
  - rams-horn mirrors;
  - roof pod, hatches and a tone break;
  - steel wheels with darker hubs;
  - a skirt that stops at the arches (pass 1's ran across them as a bar);
  - dim tinted night glass;
  - a rear cap with no window.
- **Night speckle.** The cause was the Lab camera's 0.1 m near plane at 150 m. It hit the XN40 too. Beyond 60 m the Lab now uses a fifth of the orbit distance, capped at City's 20 m near plane.
