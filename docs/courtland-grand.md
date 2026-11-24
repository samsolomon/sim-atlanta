# Courtland Grand hotel

`c3d66433-c80f-417c-9093-c623624b208b` (Overture), 165 Courtland Street NE. It opened in 1965 as the Atlanta Marriott Motor Hotel (James M. Hunt) and later became a Radisson. Amerimar refaced it and rebranded it Sheraton in 1998, and it became the Courtland Grand in 2023, with a renovation completed in October 2025. It has 763 rooms in two towers over a podium. City code: `web/src/city/courtland-grand.ts`, mounted in `city.ts` after Museum Tower and added to the downtown batcher's `listed` array. On-screen labels are generic ("Courtland Grand hotel"); no brand marks are drawn. Shipping it requires a web rebuild and redeploy; the data is unchanged.

## Sources

- History and room count:
  - [History Files](https://americanlives.historyfiles.co.uk/FeaturesStructural/Georgia_AtlantaMarriottHotel01.html): the 1965 opening.
  - [DLG / Atlanta History Center](https://dlg.usg.edu/record/geh_mjohnson_536): the original architect.
  - [Hotel Online, 1998](https://www.hotel-online.com/news/archive-49641): "two towers".
  - [LODGING, 2016](https://lodgingmagazine.com/sheraton-atlanta-finishes-20-million-renovation/): 763 rooms, a 12th-floor club lounge, and the Garden Courtyard pool under a retractable roof.
  - [Hotel Online, Oct 2025](https://www.hotel-online.com/index.php/news/763-room-courtland-grand-hotel-completes-multimillion-dollar-renovation): the 2025 renovation.
- Photographs:
  - [Flickr 4447176046, 2010](https://www.flickr.com/photos/56294332@N00/4447176046/) and [5380339080](https://www.flickr.com/photos/55462207@N00/5380339080/): the south slab's cream scalloped balconies over blue-grey frames, above a grey stucco base.
  - [Flickr 3022441400, 2005](https://www.flickr.com/photos/sheratonatlanta/3022441400/): both towers and the arrival court.
  - [Hotel Online's 2025 dusk photograph](https://hotelonline-assets1.nyc3.digitaloceanspaces.com/2025/courtland-grand-hotel-10142025.jpg): the north tower's blue glass bands between white floor bands on pale panels, and the flat box canopy that replaced the tent.
- Massing: the Esri World Imagery aerial shows the dark-roofed slab along Ellis Street, the taller tower toward the north-west, the glass courtyard roof in the middle and the round drive in the north-west corner.
- Height: 3DEP lidar (2019-04-22) over 309.1 m (NAVD88) ring ground, sampled on a 10 m grid. The south slab reads about 30–31 m, the north tower about 28 m rising to 34 m, and the podium between them 9–13 m. The mapped 40.9 m is one generic height for the whole block.

## What City draws

The frame uses City axes, with the origin at City (767, −565).

- **Podium:** the mapped outline to 11 m, in grey stucco, `#c4c3bd` (2010 photo).
- **South slab:** along Ellis Street, inside the mapped edge, to 31 m. Cream, `#e6dcc6`, with blue-grey frames, `#8296a8` (2010 photos).
  - **Ellis face:** a continuous scalloped balcony on each of 7 floors, waving 0.4–1.6 m out on a 3.6 m pitch, each with a floor back to the wall. The pitch is estimated.
  - **Other faces:** windows in cream floor bands.
- **North tower:** traced along the mapped stepped north edge, to 29 m, with a taller section to 34 m beside the arrival court.
  - **Walls:** pale panels, `#dcdcd6`, with reflective blue glass bands, `#7f9aae`, between white floor bands, `#f1f1ec` (2025 photo).
  - **Glass:** S 27% V 68%.
- **Courtyard:** a glass roof over the podium (the courtyard pool's retractable roof). Its size is estimated from the aerial.
- **Arrival canopy:** a flat dark box on one column, with a downlit soffit (2025 photo). It starts inside the curved wall and projects 2.5 m over the drive.
- **Budget:** 1,695 body triangles. A test holds every vertex within 2.5 m of the footprint.

## Rendered glass (11:30, high tier)

Median rendered colour of the north tower's glass-band pixels on its sunlit south face, from the south view (`cam=767,-565,0,55,420`): S 22%, V 59%. This meets the cap of S ≤ 36% and V ≥ 40%.

## Night

City lights 30% of rooms, chosen by skin-kit `litHash(seedOf(id), face, floor, bay)`, plus the courtyard roof and the canopy soffit. The 2025 dusk photograph shows the canopy downlights. I found no full-night exterior photograph; the courtyard glow comes from the 2014 night photograph of the pool.

## Captures

| View | Camera | Image |
|---|---|---|
| From the north-west, before and after, 11:30 | `cam=767,-565,135,55,420` | [compare-nw.jpg](log/ui/courtland-grand/compare-nw.jpg) |
| From the south (Ellis Street), before and after | `cam=767,-565,0,55,420` | [compare-s.jpg](log/ui/courtland-grand/compare-s.jpg) |
| From the north-west, 23:30 | `cam=767,-565,135,55,420` | [compare-night.jpg](log/ui/courtland-grand/compare-night.jpg) |
| Four sides by day (checked: nothing floating, missing or z-fighting) | south `767,-595,0,60,400` · west `800,-565,90,50,520` · north `767,-535,180,60,400` · east `737,-565,270,60,400` | [four-side.jpg](log/ui/courtland-grand/four-side.jpg) |
