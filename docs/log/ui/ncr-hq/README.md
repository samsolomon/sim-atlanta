# NCR Global Headquarters

NCR's headquarters (864 Spring Street, Duda|Paine, completed March 2018) replaces the generic boxes on `osm:way:26795281`. It has a 19-storey glass tower at Williams and 8th facing the Downtown Connector, a lower glass tower on Spring Street, and a garage base whose roof is the campus sky garden.

**Height basis:** the 22 April 2019 lidar, measured per mapped part. The mapped heights (68.4, 43.2 and 18 m) are floor-count guesses, and the lidar replaces them:

| Part | Lidar roof p50 | p95 / max | Model |
|---|---:|---:|---|
| Tower `osm:way:886033995` | 85.6 m | 96.1 / 97.8 m | roof 85.6 m, glass plant screen to 95 m |
| Spring Street tower `osm:way:886033999` | 54.3 m | 58.9 / 61.4 m | roof 54.3 m, screen to 58.6 m |
| Garage base `osm:way:886034005` | 19.7 m | 24.6 / 27.8 m | sky-garden roof 19.7 m, pavilion +4.2 m |

## Evidence

- **Day, from the Connector:** [Duda|Paine project page](https://www.dudapaine.com/featured-projects/workplace/ncr-headquarters/), frame 01. It shows the tower's reflective blue glass with a horizontal mullion at each floor. A triangular sloping facet is cut into the Connector face, wide at the roof and closing to the corner near the lobby. The garage base has pale horizontal louvres, and the lower glass tower sits behind it. The project text: "Sloping glass panes define the main tower."
- **Second angle:** the same page's exploded axonometric (frame 14) shows both towers' angled cuts and the sky garden with its pavilion on the garage roof. Frames 11 and 20 show the glazed street storey and the lawn terrace.
- **Dusk:** frame 03, from Spring Street. It shows a lit lobby, a few lit office floors and the tower's name sign. The sign is not drawn (no logos).
- **Gap:** I found no verified full-night (23:30) exterior. Offices are mostly dark at night: a few partial bays on each face, plus the lobbies and the garage street storey. No crown lighting appears in the photos, so none is modelled.
- **Estimates:** the facet's cut lengths (for the tower, at its south corner on Williams: 22 m up the Williams face and 3.7 m along the mapped 4.2 m south jog; 14 m along Spring and 4 m on the south face for the Spring Street tower), the 7.6 m recessed lobby, the four louvre bands, and the pavilion's size and position.

## Model

The model uses `landmarkShell`'s StaticLandmarkMaterial body and its lamp mesh. Glass and lamps are coloured by vertex. The garage walls use the library precast surface, which another Midtown landmark already compiles. The lamp mesh receives shadows, so lit bays match the wall by day. Each tower face stays in its own plane: the two faces at the cut corner are trapezoids, and the facet is one triangle shaded with more sky. The floor joints follow each face's sloping end.

| View | Camera | Local time, 20 November 2026 | Capture |
|---|---|---|---|
| Survey start | `181,-2793,32,60,268` | 11:30 and 23:30 | [Day and night](daynight.jpg) |
| From the Connector | `181,-2793,60,60,480` | 11:30 (before and after), 23:30 | [Before/after](compare.jpg), [day and night](daynight.jpg) |
| Tower foot on Williams | `110,-2800,75,70,120` with `&dev&mindist=20` | 11:30 | [Close](close.jpg) |
| Spring Street side | `181,-2793,240,58,480` | 11:30 | [Close](close.jpg) |

Use `/?view=city&cam=<camera>&t=<ISO timestamp>`.
