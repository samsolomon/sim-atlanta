# Atlanta Streetcar: Siemens S70

The Atlanta Streetcar runs four Siemens S70 cars, 1001–1004, on the 2.7-mile Downtown Loop. The lab model is at `/models.html?v=s70` (alias `?v=streetcar`); add `&night=1` for night. It isn't placed in City yet. The City streetcar work builds on the section interface below.

## Dimensions

From the Siemens Atlanta S70 data sheets (2018, reissued 2025):

| | Value | Source |
|---|---|---|
| Length over anticlimbers | 24.11 m (79.1 ft) | data sheet |
| Width | 2.65 m | data sheet (2018 sheet: 2.654 m) |
| Height, pantograph locked down | 3.84 m | data sheet |
| Pantograph, raised | up to 7.01 m; drawn at 5.6 m | data sheet; working height estimated |
| Low-floor threshold | 0.356 m (70% low floor) | data sheet |
| Trucks | two power trucks (1.9 m wheelbase), one under each end; an unpowered centre truck (1.8 m) | data sheet |
| Doors | 8 sliding plug doors, 4 a side, all in the low-floor area | data sheet |
| Roof | two HVAC units, one pantograph on the centre section | data sheet, photos |

The car is double-articulated: two long end sections with a cab each, and a short centre section. Section lengths and door positions are scaled from the data-sheet side drawing:
- End sections are 9.6 m long and the centre section is 4.31 m, with two 0.3 m bellows between them.
- Doors are centred 3.8 m and 6.45 m from the car centre on each end section.
- Trucks sit at 0 and ±8.2 m.
- Window band 1.45–2.65 m (estimated).

[2018 data sheet](https://assets.new.siemens.com/siemens/assets/api/uuid:84a2a884b764be46b8410cd8ab45d52bca0deda8/atlanta-s70-data-sheet.pdf) · [2025 data sheet](https://assets.new.siemens.com/siemens/assets/api/uuid:1199226b-3898-4e47-94b2-2a0c8bb6ca82/atlanta-s700-streetcar-data-sheet.pdf)

## Livery

The body is royal/indigo blue, cab fronts, roof fairings and skirts included. On each end section, sweeps are anchored to the mid-section door:
- A thin violet stripe and a teal band drop from the roof through that door.
- A lime wedge tapers from the roof to the window head behind it.
- Violet, teal and lime bands fall from under the door to the bottom corner of the cab, widening as they go.

The pattern mirrors about the car centre. A thin white pinstripe runs low on the sides. Windows sit in black surrounds. The cab has a raked windscreen with an amber LED destination sign along its head and a run-number display at lower left, two headlights low on the dash, a round lamp above the screen, and corner markers that show red at the trailing end. The wordmark and the emblem between the headlights are left off. Sweep shapes are estimates fitted to the photos.

**Dated references:**
- Car 1004 downtown, 4 Mar 2020: [broadside, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Atlanta_streetcar,_2020.jpg).
- Car 1001 on the Downtown Loop, 21 Mar 2016: [front, CC BY 2.0](https://commons.wikimedia.org/wiki/File:Siemens_S70_tram_on_the_Atlanta_Downtown_Loop.jpg) and [rear, CC BY 2.0](https://commons.wikimedia.org/wiki/File:Siemens_S70_tram_on_the_Altalnta_Downtown_Loop.jpg).
- Car 1001 on Edgewood Avenue, 27 Oct 2016: [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Atlanta_Streetcar_on_a_mid-morning_run_heading_east_on_Edgewood_Avenue.jpg).
- Car 1003 at King Memorial, 9 Jun 2017: [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Atlanta_Streetcar_arriving_at_King_Memorial_Stop.jpg).

**Is it still current?** MARTA took over operations in 2018. Service paused from 8 Sep 2025 for Georgia Power utility repairs and resumed on 3 Feb 2026 with a "signage and vehicle update" ([MARTA](https://itsmarta.com/streetcar-to-return-to-service.aspx), [Metro Magazine](https://www.metro-magazine.com/10193207/atlanta-streetcar-returns-to-downtown-expected-to-launch-in-early-march)). The relaunch coverage used photos of the same blue livery. No free photograph from 2021–2026 was found, so the current appearance rests on that coverage. Car 1003 wore an Atlanta United advertising wrap in August 2018. No current wrap was found, and wraps aren't modelled.

**Night:** no freely licensed night photograph exists. The interior has white ceiling light strips and blue seats (data-sheet photo), and a 2015 night shot of car 1003 shows white headlights and an amber destination sign ([RailPictures, reference only](https://www.railpictures.net/photo/862574)). In the lab the window band glows with the shared warm stock glow, which is a little warmer than the real white light. The leading cab lights its headlights, top lamp, markers and destination sign, and the trailing cab shows red.

[Front three-quarter](log/streetcar/s70-front34.jpg) · [Side and sweeps](log/streetcar/s70-side.jpg) · [Cab front](log/streetcar/s70-front.jpg) · [Trailing cab and night](log/streetcar/s70-rear-night.jpg)

## Interface for City

`web/src/vignette/streetcar.ts` provides:
- `s70Geometry({ leadingA, leadingB })`: the whole car, rigid (lab use).
- `s70Sections({ leadingA, leadingB })`: the car split into three bodies, B, C and A, each in its own frame.
- `s70Material(night)`: the shared stock material. It takes a `{ value }` darkness uniform and supports clipping planes.
- `S70_LAYOUT`: section extents, pivots and trucks.

The car frame has y = 0 at the railhead, z = 0 at the car centre, and +z toward cab A. Each section geometry is centred on its own `centre` (car z). To bend the car round a curve, put a section's two `pivots` on the track and point its local +z along the chord:
- The centre section rides on the two joints, ±2.305 m.
- Each end section rides on its joint and its power truck at ±8.2 m.

The two bellows belong to the centre section.
