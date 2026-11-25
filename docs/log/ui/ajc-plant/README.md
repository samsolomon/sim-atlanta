# Former Atlanta Journal-Constitution printing plant

The skin covers the windowless printing plant and its adjoining roof parking deck between
Marietta Street and Ted Turner Drive. Overture maps the deck as `08b3e01b` and the plant
as `df3490e1`. The former AJC office tower at 72 Marietta Street is a separate building.
[AJC property history](https://www.ajc.com/business/former-ajc-headquarters-given-city-atlanta/hWWr8c2UaOkEOKeeAclfhP/)

The street-level photograph shows precast panels above buff tiles, dark vertical drains and
wall-mounted fixtures on the plant. The aerial establishes the two different roof uses,
including the deck's open surface and stair towers. Tile height (about 4 m above the low end
of each wall), drain spacing (about 6.5 m), the 0.4 m parapet thickness and rooftop equipment
footprints are estimates. The deck's plain precast uses the plant as a colour reference.
[Street View frame published by Bisnow](https://www.bisnow.com/news/atlanta/office/cim-group-to-tear-down-former-downtown-printing-press-for-1-centennial-yards-office-tower-117840) ·
[Aerial at the site](https://www.google.com/maps/@33.75623,-84.39279,185a,35y,0h,0t/data=!3m1!1e3)

The 2019 lidar puts the deck slab at 350.5 m NAVD88, its parapet at about 353 m and its high
stair tower at 357 m. The plant's main roof is 351.7 m, with mechanical units around 356–357 m
and a raised roof block up to 359.5 m. Grade at the complex ranges from about 314 m on the
Gulch side to 321 m at Marietta Street.
[USGS 3DEP Georgia statewide point cloud](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json)

Night appearance is estimated. The daytime photo shows fixtures, and a reliable photograph
showing their operation after dark was unavailable. The model has no emissive lighting.
Street lighting comes from the surrounding City scene.

Publishing the skin requires rebuilding `web/dist` and deploying the updated web bundle.
The model uses the existing staged footprints and terrain.

## City views

Times are Eastern on November 20, 2026. The daylight and full-night comparison rows use
matched High cameras. The planned four-side sheet uses Low.

| View | City camera | Time |
| --- | --- | --- |
| [135° before and after](compare-135.jpg) | `-77,-241,135,58,330` | 14:00 and 23:00 |
| [315° before and after](compare-315.jpg) | `-122,-288,315,58,330` | 14:00 and 23:00 |
| [North-west wall close-up](deck-wall.jpg) | `-104,-300,60,70,200` | 11:30 |
| Four sides (capture pending) | `-98,-260` at 330 m | 11:30 |

## Verification checkpoint

Branch `samsolomon/ajc-printing-plant` contains product commit
`1ad1ba877b2514eb74f60f63e60982af206c536b`. The focused regression check and web build passed.
On resumption, run the full suite under the Studio lock, capture the four-side sheet, then run
the tier budgets and paired production performance checks before final independent review.
