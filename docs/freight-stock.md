# Freight stock

Freight in City is **illustrative**: positions, timing and consists are simulated, and the card says so. The rolling stock is modelled from dated photographs of the kinds of locomotives and cars on Atlanta's lines, in **look-alike** schemes with no emblems, lettering or numbers.

## Locomotive: GE AC4400CW family (CSX CM44AC)

CSX 7257, seen in Sam's Georgia State photo, is a CM44AC: a GE AC4400CW rebuilt by Wabtec at Erie from 2019, with a new GEVO-style cab. NS's AC44C6M rebuilds and ES44ACs share the same basic GE outline. The lab has both schemes on one body:
- `/models.html?v=cm44ac`, CSX-like
- `/models.html?v=cm44acNs`, NS-like

**Dimensions** (AC4400CW data; [Diesel Shop](https://thedieselshop.us/DataAC4400.HTML), [Wikipedia](https://en.wikipedia.org/wiki/GE_AC4400CW)):

| | Value |
|---|---|
| Length over couplers | 73 ft 2 in (22.30 m) |
| Truck centres | 53 ft centre bolster (16.15 m) |
| Truck wheelbase | 13 ft 2 in |
| Wheels | 42 in |
| Cab roof | 15 ft 4 in (4.67 m) |
| Radiator | 15 ft 6 in (4.72 m) |
| Cab width | 10 ft 3 in |
| Hood width | 9 ft 11 in |
| Fuel | 5,000 gal |

**Modelled details:**
- **Cab:** a raked front with a two-pane windscreen and wipers, number boards on the roof's front edge, side windows with visors, and the cab door.
- **Nose:** yellow on the CSX-like scheme. It carries stacked headlights high and just off centre, a porthole, ditch lights at the bottom corners, red and green markers, and railings.
- **Long hood:**
  - a louvred electrical cabinet and intake behind the cab
  - the engine hood with door seams and an exhaust stack
  - the flared radiator with wing intakes overhanging the walkways
- **Walkways:** side handrails on stanchions.
- **Running gear:** a sill stripe, GE Hi-Ad three-axle trucks, the fuel tank with air reservoirs, snowploughs and steps.
- **Rear:** an end panel with its own headlight and number boards.
- **Lighting:** the end that leads lights its headlights, ditch lights and number boards at night (the stock material's `stockLight`). City freight still uses a plain material, so lamps show as painted there.

**Schemes:**
- **CSX-like:** blue-grey body, yellow nose, rear panel, sill stripe and end railings, after the YN3 units. Inputs are lighter than the targets because the grade darkens them.
- **NS-like:** black, with white horizontal nose stripes and white end railings.
- **Running gear:** weathered dark grey-brown, as in the photos, not black.

**Estimated, not sourced:** the exact rake of the cab front, cabinet and dynamic-brake box positions, fuel tank length (about 8.6 m), and the horn and antennae, which are not modelled.

**References:**
- [CM44AC 7232, Folkston GA, 14 Apr 2026, CC0](https://commons.wikimedia.org/wiki/File:CSX_7232_at_Folkston,_GA.jpg)
- [CM44AC 7216, Chicago, 13 Apr 2025, public domain](https://commons.wikimedia.org/wiki/File:Chessie_System_Monday-_CSX_7216_Leading_M337.jpg)
- [AC4400CW 69, 10 Jun 2022, CC BY-SA 2.0](https://commons.wikimedia.org/wiki/File:CSX_engines_around_the_yard_-_52317572427.jpg)
- [AC4400CW 465 at night, Framingham MA, Aug 2026, CC BY 4.0](https://commons.wikimedia.org/wiki/File:CSX_AC4400CW_from_above_at_Nevins_Yard,_Framingham,_MA_August_2026.jpg)
- [NS ES44AC 8176, Gwinnett County GA, 8 Feb 2026, CC BY 4.0](https://commons.wikimedia.org/wiki/File:Passing_train,_Mechanicsville_GA.jpg)

**In City:**
- The downtown CSX line uses the CSX-like unit.
- The illustrative Norcross District passage at Brookwood uses the NS-like unit.
- The freight card names the scheme and stays `illustrative`.
- One locomotive is 2,608 triangles. Units share one geometry per type, so draw calls are unchanged.

[Cab side, photo vs model](log/freight/cm44ac-side34.jpg) · [Front three-quarter](log/freight/cm44ac-front34.jpg) · [Night](log/freight/cm44ac-night.jpg) · [NS-like](log/freight/cm44ac-ns.jpg) · [Lab before and after](log/freight/cm44ac-lab.jpg) · [Brookwood, NS-like passage at 14:03](log/freight/brookwood-ns-day.jpg)
