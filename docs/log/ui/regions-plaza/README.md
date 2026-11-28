# Regions Plaza

Regions Plaza (1180 West Peachtree, completed 2001, renovated 2014, formerly Atlantic Center Plaza; Smallwood, Reynolds, Stewart, Stewart) replaces the generic box on `osm:way:269843399`. It is a square, 24-floor office tower with notched corners that stop at 84 m. Above them, a cross-shaped top storey has tall round-headed windows and corner finials, under a truncated hip roof with a rail.

## Second pass (release 21): its own shape, One Atlantic's stone

**Third revision (2026-11-28):** Sam likes the rework's shape but wants the colour and texture to match One Atlantic Center, because in life the two read as the same stone. The tiers, window pairs, arched base, slate hip and lamps stay. The stone, trim, glass and window frames now come from `oneAtlanticFacade` in `web/src/city/johnson-burgee.ts`, which One Atlantic's own skin also reads. So both towers use one set of values, not copies. The values are vertex colours, so Regions keeps batching with its neighbours: 0 programs and 0 draws.

One Atlantic's ashlar joints are a shader hook. I left them off Regions on purpose, because the hook excludes a mesh from the landmark batch, which costs a draw of its own. The joints also fade out once a course is below a pixel, which happens at City range. And the hook's `y < 200 m` test is written for One Atlantic's local frame; Regions' vertices sit at NAVD88 heights (about 280 m and up), so it would draw no joints there.

Captures for this revision, the first rework (ivory) against now, 20 November 2026, High: [match.jpg](match.jpg) (`345,-3700,20,66,1150`; One Atlantic's crown is at the top edge) and [match-south.jpg](match-south.jpg) (`330,-3684,15,55,800`), each at 11:30 and 23:30.

**Budget** (`pnpm test:perf`, perf lock held, main's three files swapped in for A): Low calls 342 → 342, programs 80 → 80, geometry 164.2 → 164.2 MB; High calls 435 → 435, programs 94 → 94; High night calls 485 → 485.

The rest of this section records the first rework, which gave Regions its own pale stone.


Sam's note (2026-11-27): the first skin (PR #502) read as One Atlantic Center's twin. Both had the same warm pink granite, the same fine grid of dark windows and similar crowns. The photos show three differences that hold at the default ~500 m view, and the skin now draws all three:

| | One Atlantic Center | Regions Plaza (this pass) |
|---|---|---|
| Stone | Pink Spanish granite, `#ccaea0` | The same granite, `#ccaea0`, with One Atlantic's trim `#d7c1ae` (Sam, 2026-11-28; the first rework used pale ivory `#ddd6cc`) |
| Facade | Grouped dark glass in light frames, granite bands every three floors | Five tiers of three floors, each framed by a granite spandrel band; each bay holds a pair of tall windows in One Atlantic's glass (`#485768` family) and light frame (`#d6cec4`), between wide piers |
| Crown | Steep copper-green pyramid, gold spire, gold night wash | Low truncated hip in cool grey-green slate metal (`#717a7b`, was warm `#8f877b`), rail on top, cream night wash on the slate |

**Heights are unchanged:** the 22 April 2019 lidar per mapped part.

| Part | Lidar p50 (p95 / max) | Model |
|---|---:|---|
| Notched corners `…1281`–`…1284` | 84.0–85.1 | 84.4 m |
| Cross wings `…8612`–`…8615`, `…1286` | 96.4–96.8 (to 99.6) | parapet 96.8 m, finials +3.4 m |
| Hip roof `…1278`–`…1280` | 101.4–103.0 (104.7) | slopes to a 104 m deck |
| Crown deck `…1285` | 102.9 (109.2) | rail to 105.2 m; the 109 m returns are rooftop plant, not modelled |

**Footprint:** the mapped outline is about 49.5 m (east–west) by 43.7 m (north–south), with chamfered corners. The model's plan is a 49.6 × 43.6 m box with 10.1 × 7.4 m corner notches above 84.4 m.

## Evidence

- **Day, from the south, elevated, late afternoon** (2025, judging by the file name): [Wikimedia Commons, *ARegionsMT2510-0522*](https://commons.wikimedia.org/wiki/File:ARegionsMT2510-0522.jpg). One Atlantic Center's shaft is in the left of the frame, in shade. It shows the five three-floor tiers, the window pairs with light frames, finials on every pier at the corner roofs and on the cross, the arched top storey, and the slate grey-green standing-seam hip roof with its rail. In the warm light, sunlit stone samples at `#ecdac2`, and the shaded west face samples neutral grey (`#94928f`). So the stone itself is close to neutral, and the warmth comes from the sun. The roof samples at `#80887b` in sun and `#404345` in shade.
- **Day, from the south, midday:** [Midtown Alliance listing](https://www.midtownatl.com/view/regions-plaza), undated. This view is the clearest on the window rhythm and the base: a tall arched entrance, tall lobby windows, and a row of small square windows above them. The base is about five storeys. Its colour is rose-tinted (stone `#d3bfba`, roof mauve-grey `#978482`), probably from processing, so it doesn't decide the colour.
- **Both towers in the same light:** a rooftop photo sphere from The M by Radius (Google Maps contributor imagery, August 2018, looking north up West Peachtree): [pano](https://www.google.com/maps/@33.7847897,-84.3880415,299a,35y,5h,100t/data=!3m4!1e1!3m2!1sCIHM0ogKEICAgIC4yuGVywE!2e10). Both towers are lit on their south faces and seen through the same glass railing. Regions' light stone samples at `#abaaa4`, nearly neutral. One Atlantic Center's samples at `#a49890`, warmer, pinker and a little darker. Regions' roof samples cool grey (`#626a6f`). This frame decides the colour step: lighter and much less saturated than One Atlantic Center.
- **Night, from the north-east, elevated:** [Wikimedia Commons, *Atlantic Center Plaza 3 NightPhoto*](https://commons.wikimedia.org/wiki/File:Atlantic_Center_Plaza_3_NightPhoto.jpg), 1 November 2005, 19:31. The hip roof is floodlit as one even pale glow, the arched top storey is lit behind most windows, and the base stone is washed warm. Each tier shows three lit office rows, which fixes the three-floor module. **Gap:** this is the only reliable night exterior found, and it predates the 2014 renovation. The tenant's sign now on the crown is not drawn (no logos).
- **Estimates:** the 20.4 m base; 4.27 m storeys (five tiers of three floors between the base and the 84.4 m corner roofs); 7.1 m bays with 2.35 m windows; the size of the arch, the hip roof's footprint and the finials.

## Model

Everything is vertex colours on `landmarkShell`, using the same two builders (`body` and `lights`) as before. That adds no programs or draw calls and keeps the skin batchable. The 500 m view can't resolve a library surface's detail or the 0.2 m pane frames, so neither is drawn. What reads at that distance is the stone's value, the tier bands, the pier-to-glass ratio and the crown's colour.

- **Shaft:** each floor of each window is one pane, so at night offices light one at a time (`litHash`, about 10%).
- **Base:** tall lobby windows, a row of small square windows, and an arched entrance at the middle of each face (lamp mesh).
- **Crown:** the slate hip is in the lamp mesh, so it glows as one even cream surface at night (the warm lamp colour `#f4dcb4` the offices share), set apart from One Atlantic Center's tall gold pyramid by shape and its lighter slate.

## Captures

Before and after on 20 November 2026, at 11:30 and 23:30, on High. Use `/?view=city&q=high&cam=<camera>&t=2026-11-20T11:30:00-05:00`.

| View | Camera | Capture |
|---|---|---|
| Both towers and both crowns, from the south-south-west | `345,-3700,20,66,1150` | [pair.jpg](pair.jpg) |
| South and west faces, One Atlantic Center to the right | `330,-3684,15,55,800` | [south.jpg](south.jpg) |
| West and north faces, One Atlantic Center behind | `345,-3684,105,52,600` | [northwest.jpg](northwest.jpg) |
| Crown close-up (dev `__setView(20,50,550,345,-3790,3.2)` with `&dev&mindist=20`), after only | — | [crown.jpg](crown.jpg) |

In the pair frame, One Atlantic Center's crown is clipped at the top edge.

**Pre-existing, unchanged:** the hip roof's rectangular base (from #502) reaches about 5.9 × 3.2 m into each corner notch, 12.4 m above the corner roofs. It shows in `crown.jpg` as a thin overhang at the notches.

`compare.jpg`, `daynight.jpg` and `close.jpg` are the first pass (PR #502).
