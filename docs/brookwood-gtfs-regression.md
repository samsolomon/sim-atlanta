# Brookwood regression and rolling GTFS — 2026-11-23

The two corridor train tests sampled November 20, 2026 but loaded gitignored,
locally generated GTFS data. The Amtrak feed dated November 23 starts its earliest
service calendar on November 22; the November 20 feed started on November 15.
Consequently both tests counted zero Crescent placements after a fresh download.
The Amtrak path objects in these two editions are identical. MARTA is not involved.

The regression now uses `web/src/city/fixtures/brookwood-timetable.json`, a 14,973-byte
recording derived from the November 20 pipeline output of
<https://content.amtrak.com/content/gtfs/GTFS.zip>. It retains the Crescent route,
Amtrak stops and vehicle type, the three trips whose calendars operate on November
19 or 20, and their patterns/services. Geometry is clipped to the rectangle
longitude (-84.47, -84.32), latitude (33.75, 33.86), including one vertex beyond each
end. Path cumulative distances and pattern stop distances are shifted by the same
first retained chainage. This preserves the Atlanta geometry and stop interpolation;
positions outside the clip clamp beyond the Brookwood placement bounds. It is a
test fixture, never imported by runtime code or copied to public data.

The assertions still require continuous travel in both directions from edge to
edge and freight exclusion during every sampled Crescent presence. They now run
without local pipeline data, rather than silently skipping in a fresh checkout.

## Production impact

No runtime or pipeline code changes. No rebuild, data refresh or deploy is required
for this test-only fix. A future `pnpm data` using the November 23 Amtrak edition
will legitimately remove Crescent coverage before November 22. In particular,
November 20 screenshot/demo URLs will show no Crescent; do not backdate the feed
calendar to preserve them. Current covered dates still work: the original two
integration checks were run against the fresh tree-lab data with the sample window
changed to November 23 06:00 ET through November 24 06:00 ET, and both passed.
The full historical suite is run with that fresh data still staged locally.
