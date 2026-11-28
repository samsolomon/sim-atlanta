# Regions Plaza

Regions Plaza (1180 West Peachtree, completed 2001, renovated 2014, formerly Atlantic Center Plaza; Smallwood, Reynolds, Stewart, Stewart) replaces the generic box on `osm:way:269843399`. It is a square, 24-floor office tower with notched corners that stop at 84 m. Above them, a cross-shaped top storey has tall round-headed windows and corner finials, under a truncated hip roof with a rail.

## Second pass (release 21): its own look

Sam's note (2026-11-27): the first skin (PR #502) read as One Atlantic Center's twin. Both had the same warm pink granite, the same fine grid of dark windows and similar crowns. The photos show three differences that hold at the default ~500 m view, and the skin now draws all three:

| | One Atlantic Center | Regions Plaza (this pass) |
|---|---|---|
| Stone | Pink Spanish granite, `#ccaea0` | Pale, near-neutral ivory, `#ddd6cc` (was `#dcc3ae`) |
| Facade | Grouped dark strips, full height | Five tiers of three floors, each framed by a light stone spandrel band; each bay holds a pair of tall windows between wide piers |
| Crown | Steep copper-green pyramid, gold spire, gold night wash | Low truncated hip in cool grey-green slate metal (`#717a7b`, was warm `#8f877b`), rail on top, pale white night wash |

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
- **Crown:** the slate hip is in the lamp mesh, so it glows as one even surface at night, with a pale wash (`#f2ece0`) instead of One Atlantic Center's gold.

## Captures

See the PR for the before and after stills (11:30 and 23:30, from two sides, one framed with One Atlantic Center).
