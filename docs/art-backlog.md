# Art backlog

Ideas to use when we get to the detailed modelling. They're not scheduled yet.

## MARTA CQ400 rail cars
- MARTA is moving to the new **CQ400** cars (https://itsmarta.com/newCQ400railcars.aspx;
  video: https://www.youtube.com/watch?v=F4O_wVL38yI).
- **The front and back cars light up with the colour of the line they're running.** Light
  each train's cab ends with its line colour (Red/Gold/Blue/Green). This is a good place for
  the agency-colour accent in our "colour = kind of service" system. Live data says which
  line a train is on.
- Model the cars from the reference photos/video: a generic look-alike, no MARTA logos.

## Camera
- "Ride along": attach the camera to a train and see the world from it. The path + distance
  model already supports this.

## Rendering styles
- Low-poly with ink outlines is the baseline. Add a pixel-art mode later: render at low
  resolution, upscale with nearest-neighbour, limit the palette.
- Time of day from the real sun ("blue hour"). Weather from the NWS API.

## Cutaway (decided 2026-11-20)
- Underground trains drawing over buildings is fine for now. Revisit it in the polished
  version: fade buildings near the selected train, use a ground-cut stencil, or use a
  sectional "slice" view.
- **Underground view for City (Sam, 2026-11-21).** Most downtown MARTA track is underground,
  so with only open track drawn, City hides most of the trains. Trains are the most compelling
  part, so add a toggle (or a hold-key) that fades the board and buildings and draws tunnel track
  and trains as a tinted cutaway at their schematic depths. The retired `scene3d` did this
  (depth-tinted, no depth test). Label the depths schematic, and keep each train's position tier
  (live or scheduled). Not built yet; consider it with M2b motion.
