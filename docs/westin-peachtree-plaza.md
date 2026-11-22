# Westin Peachtree Plaza

From the Gulch, the hotel now reads as a narrow glass cylinder between the office towers. The former generic building took its roof height across the entire hotel block. The new model keeps that long footprint at podium height and places the tower on its west end.

| View | Previous City | Westin |
| --- | --- | --- |
| Gulch skyline, afternoon | [Before](log/ui/westin/gulch-before.jpg) | [After](log/ui/westin/gulch-after.jpg) |
| Hotel, afternoon | [Before](log/ui/westin/close-before.jpg) | [After](log/ui/westin/close-after.jpg) |
| Hotel, night | [Before](log/ui/westin/night-before.jpg) | [After](log/ui/westin/night-after.jpg) |

## What located the tower

The baked Overture feature `16cab934-34dc-4dca-8eb2-3ce9dc57d877` bounds a 124.7 × 43.8 m block and carries one 219.7 m height. The OSM parent follows the same block. A separate 73-level glass building part has a circular perimeter and a small northeast lobe. In City's local east/south metres its circle is approximately centred at (279.5, −614.9), radius 19.6 m. The Sun Dial point falls within 0.4 m of that centre. The narrow elevator is centred near (296.7, −627.2). These are map-derived dimensions. [Mapped hotel](https://www.openstreetmap.org/way/42904130) · [Tower and lift outline](https://www.openstreetmap.org/way/192939493) · [Sun Dial location](https://www.openstreetmap.org/node/2661649031)

I checked the buildings that meet the parent footprint. The 44.5 m 200 Peachtree building and the 34.8 m parking structure share its southern boundary. The 79.4 m bake on the north side is mapped as a bridge toward AmericasMart. Those features retain their own City geometry. The Westin tower part supplied the plan reference and has no separate tower feature in this bake. [200 Peachtree](https://www.openstreetmap.org/way/317949454) · [Parking structure](https://www.openstreetmap.org/way/871428781) · [Bridge](https://www.openstreetmap.org/way/1040543347)

## What the photographs changed

- Portman Architects' park approach shows the unbroken, silvery curtain wall, a dark band just below the roof, and a narrow bright coping. Its elevated oblique shows stepped dark reflections of neighbouring towers in the lower panes. The miniature approximates those reflections with fixed tones around the cylinder. [Park approach](https://portmanarchitects.com/wp-content/uploads/2019/03/Slider2-88.jpg) · [Elevated oblique](https://portmanarchitects.com/wp-content/uploads/2019/03/Slider-89.jpg)
- Portman's opposite elevation shows the projecting lift running to the crown. Its architectural section places a low, skylit podium around the core. The architect documents seven podium stories. The model uses an estimated 26 m podium, shallow folded skylights and a simplified ribbon façade. [Elevator elevation](https://portmanarchitects.com/wp-content/uploads/2019/03/Slider6-61.jpg) · [Architectural section](https://portmanarchitects.com/wp-content/uploads/2019/03/Slider7-55.jpg) · [Architect's project description](https://portmanarchitects.com/project/the-westin-peachtree-plaza/)
- The Sun Dial describes three upper levels and gives a hotel height of 723 ft (220.4 m). Portman's project summary lists 754 ft (230 m). Their measurement datums are unspecified. City uses the existing 219.7 m bake at its parapet, with a 0.35 m schematic roof cap. The crown bands, pane count, reflected silhouettes and evening room lights are illustrative. [Sun Dial history](https://www.sundialrestaurant.com/about/) · [Portman project dimensions](https://portmanarchitects.com/project/the-westin-peachtree-plaza/)

## Integration and reproduction

City passes its remaining building list and nullable, scene-relative DEM sampler to `createWestin` before the generic terrain building batch. It attaches the result after the plinth, and drives window emission from the same night value as the surrounding scene. A missing footprint, mismatched location or missing foundation sample returns the original generic rendering path. World teardown disposes both meshes and their materials, including the two generated 256 × 256 colour and emission maps. The maps occupy 512 KiB together before mipmaps. The landmark adds two meshes and needs only the normal web rebuild and deployment. [Model](../web/src/city/westin.ts) · [Registration](../web/src/city/city.ts) · [Geometry and fallback tests](../web/src/city/westin.test.ts)

To reproduce the desktop Orca captures, open `/?view=city&q=high&t=2026-11-20T14:12:45-05:00&speed=0` at 1446 × 876. For the wide view, call `__city.lookAt(195, -480, {bearing: 38, metresPerPixel: 0.99, tilt: 63})`. For the closer view, call `__city.lookAt(320, -735, {bearing: 19, metresPerPixel: 0.48, tilt: 68})`. The night frame uses the same close camera at 19:30 EST.
