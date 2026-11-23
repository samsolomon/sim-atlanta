# Follow any vehicle: review sheets

Each sheet is captioned, and its subject is outlined or ringed. Captured over localhost in headless Chrome at 2×. The BEFORE frame comes from the deployed-equivalent `fd2ccc7` build.

1. [Red Line under Midtown, BEFORE/AFTER](underground-before-after.jpg): `/?view=city&q=high&cam=482,-3063,-83,63,600&weather=clear&speed=0&t=2026-11-20T13:30:00-05:00&follow=marta:route:RED`
2. [Red Line drawn at the Brookwood portal](portal-day-high.jpg): `/?view=city&q=high&cam=500,-5520,40,55,420&weather=clear&speed=0&t=2026-11-20T13:07:45-05:00&follow=marta:route:RED`
3. [Gold Line under Midtown at night, high tier](underground-night-high.jpg): `/?view=city&q=high&cam=482,-3063,-83,63,600&weather=clear&speed=0&t=2026-11-20T23:00:00-05:00&follow=marta:route:GOLD`
4. [390 px, low tier, day and night](phone-390-day-night.jpg): the same cameras with `q=low`.
5. [Live MARTA bus at the real clock](bus-live.jpg): `/?view=city&q=high&cam=<x>,<z>,30,50,400&follow=marta:bus:<vehicle>`. Bus ids are live, so pick one that is currently reporting.

The underground claim comes from OSM `tunnel=yes` ways for the MARTA North Line, baked into `web/src/city/fixtures/midtown-tunnel.json` by `pipeline/scripts/midtown_tunnel.py`. It covers 20 runs from the downtown edge (z −1300) to the Brookwood portal (z −5140).
