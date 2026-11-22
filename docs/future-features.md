# Future features

Ideas parked on November 22, 2026. The Sunday release goal is a public homepage someone can open, explore and understand on a first visit.

## Share a view of Atlanta

Let a visitor copy a link to the scene they are looking at. Preserve the point on the ground, bearing, tilt and zoom. A link to the live city should open at the recipient’s present time. A link to a replay should restore its clock. A few named views could use the same mechanism, starting with MARTA above freight above the Downtown Connector at Georgia State. Try opening a link on a phone with a different screen shape and check that all three levels are recognizable. [TinyRJ’s places and camera controls](https://tinyrj.com/)

## Spend vehicle detail where people can see it

Measure the same wide downtown view and the same close train approach on the Galaxy A16. Compare frame times with normal traffic, with offscreen illustrative traffic updates skipped, and with simpler distant vehicles. Hold the camera, clock, weather and quality tier fixed. Check that traffic in each direction still reads at the Connector and a selected train keeps its position and identity through a zoom. Prior phone measurements establish a baseline for the whole scene. [Build log](build-log.md) · [Pixel Singapore and San Francisco implementation notes](https://www.yadongxie.com/blog/how-isometric-pixel-city-was-made)

## Build a neighborhood from a fork

Could someone fork Sim Atlanta, name a station or street corner in their own city, and publish a small board they recognize? Start with one neighborhood in a second city. Give the fork a boundary, local time zone, and sources for streets, buildings and terrain. Reuse the camera, materials and renderer. Document how a contributor adds one landmark from local references. Offer scheduled transit where a timetable exists and live positions only where a suitable feed exists.

April Zhu’s Pocket City is a working example of this authoring workflow. A place and a plot size lead to a portable HTML scene. The published Amsterdam example uses municipal building and tree data and identifies the illustrated details separately. A first trial for Sim Atlanta would be successful if a contributor could build that second neighborhood from the instructions, recognize it from a real photograph, and tell which features came from data and which they supplied. [Pocket City and its field notes](https://april-zhu.com/pocketcity) · [Author’s downloadable skill](https://april-zhu.com/pocketcity/skill/pocket-city.tar.gz)

## People and seasons at street level

Try one illustrative street scene at Georgia State station. Put a commuter with a backpack under the canopy and a second person walking a bike toward the entrance on a verified pedestrian path. Test the silhouettes from the opposite side of the street. Two wheels, the angle of a torso and one patch of jacket color should carry the pose. At that scale a few figures can show where the entrance is and how tall the platform feels, even between trains.

Seasonal detail is deferred while we work on sidewalk and trail users. City already changes its tree canopy with the date. Give the same street a few smaller seasonal changes too. Try blossoms on a locally documented flowering tree, a summer rider waiting in the shade, and a few autumn leaves gathered along a curb. In rain, an umbrella outside the canopy tells a different story from someone standing under it. For winter, try coats and bare branches, with snow reserved for a snow scene like Sam’s Georgia State photograph. Treat people and their movements as illustrative. Pocket City’s Kyoto example pairs local foliage with changes in clothing and models snow as a separate scene. [Pocket City and its field notes](https://april-zhu.com/pocketcity) · [Published example scenes](https://april-zhu.com/pocketcity/skill/pocket-city.tar.gz)

## Pieces to reuse as City grows

- **People on a route.** A walker’s clothes and gait and a cyclist’s bike and riding pose belong to the figures. The sidewalk or trail supplies a line, direction and supporting surface. The same walker can approach a station or use the Westside Beltline Connector. Crowding and the permitted activities can differ by path. [Existing distance-along-line helper](../web/src/vignette/geom.ts)
- **Platforms and track edges.** A single island can serve trains on either side. Reuse the existing slab and boarding-edge model when the board reaches another MARTA station, including Airport, after checking that station’s layout. [Station platforms and boarding edges](data-model.md#station-platforms-and-boarding-edges)
- **Tintable window glass.** The Westin already shares its mirrored-glass material. A glass office or apartment tower can change the tint and window spacing while keeping reflections responsive to the camera. [Glass material](../web/src/city/mirrored-glass.ts)

## Trail planting and ground textures

Grass placement is parked. At Mangum Street the planted strip reads clearly from its ground colour and concrete edge. Sam preferred that treatment with the modeled tufts removed. Revisit placement on a stretch where a local photograph shows distinctive planting at walking scale. [Earlier Mangum study and photographs](log/ui/trail-planting/path/README.md)

Use one close trail view to study the surfaces beside the people. Try sparse flecks fixed to grassy ground, a patch of worn earth at a path edge, and directional strokes on exposed stone where a local reference shows it. Keep tall grass in small clumps with different heights. A passing gust could bend several clumps together, with more motion at the tips and the roots fixed. Shrubs can keep a heavier silhouette. Check the same camera from above so the marks do not shimmer when they become smaller than a pixel. This study can use a single daylight scene. [April Zhu’s Sa Pa landscape](https://april-zhu.com/pocketnature/sapa)

## Fill the blocks around King Memorial

King Memorial is the first train destination beyond the downtown board. Fill adjoining blocks on the same 5 m grid as the map grows toward a broadly square footprint. Before choosing a housing model, match recent dated street and aerial photographs to the particular addresses and mapped footprints. At 240 Grant Street the current reference is a mid-rise apartment and retail development on former station parking. Sample the next block independently before reusing its roofs, balconies, porches or lot spacing. [King Memorial block evidence](log/ui/king-memorial-board/README.md)
