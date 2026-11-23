# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary visitor follows a link: someone opens a shared Sim Atlanta view from a friend
or social post with no context. They can be on a phone or a desktop, and both matter
equally. They need to understand at a glance that this is Atlanta, what place and time
they're looking at, and how to move around. Secondary visitors are curious Atlantans,
rail and map fans, and an art and design audience who come for the miniature and the
staged shots. The product is built for visitors, not for its author. Staged shots are a
nice extra, not a creator tool.

## Product Purpose

Sim Atlanta is a free, fast map of where Atlanta's trains are right now, or are likely to
be. It is becoming an art project: a real-time, low-poly 3D miniature of Metro Atlanta
that starts downtown (Five Points / the Gulch) and will grow to a square enclosing I-285
and the entire airport. It succeeds when someone who lands on a shared view immediately
sees a living city, can explore it the way they explore any map app, and wants to share
a view of their own.

## Positioning

A hand-made, real-time miniature of one city. It combines live and scheduled transit data
with a low-poly diorama, and it is honest about how certain each fact is (truth tiers).
It is neither a transit app nor a generic 3D map.

## Operating Context

- Views: Map (2D, MapLibre), City (3D downtown diorama, Three.js), and Street (planned).
- The clock can be the real present (live MARTA data) or shifted, paused or sped up (timetable data).
- Shared URLs already carry `view`, `t` (time), `speed` (`0` freezes) and `board`.
  Camera position is not yet in the URL (`__city.lookAt` is dev-only).
- The Model lab (`/models.html`) is a public companion page.

## Capabilities and Constraints

- Free to host on the Cloudflare free tier. Nothing may add per-visitor server cost or uncached upstream calls.
- Every fact a user sees carries a truth tier (`live`, `scheduled`, `reported`, `inferred`, `illustrative`). Live data never appears at a non-present clock.
- Colour means the kind of service (city rail blue, intercity violet, freight rust), not the agency. No operator logos.
- Planned: an ambient radio of ~10 calm, SimCity-style original tracks (~30 min) in rotation. The UI comes first and the music later.
- Planned: address and place search that jumps the camera. Scope and data source are undecided.
- Planned: share a view by URL, with the option to keep the live clock or freeze the moment.
- Later: an idle tour that drifts between staged shots, and Street view.

## Brand Commitments

The name is Sim Atlanta. Visual direction (AGENTS.md, 2026-11-20): a low-poly, ink-lined
railway miniature with warm paper and ink, and frosted-glass UI chrome. Landmarks look
real; everything else is stylised.

## Evidence on Hand

Real data from MARTA GTFS and realtime, Amtrak GTFS, FRA, OSM and Overture. Landmark
studies and matched camera shots are in `docs/`. There are no testimonials or usage
numbers; don't invent any.

## Product Principles

1. The miniature is the product. The UI is a quiet frame around it.
2. Never overstate certainty. Time, data and weather always show their truth tier.
3. Move like a map. Gestures follow what people already know from Apple and Google Maps.
4. Every view is shareable. What you see can be sent as a link and reopened exactly.
5. Free for everyone. Features that cost money per visitor don't ship.

## Accessibility & Inclusion

Phone and desktop get equal care. Controls must be usable by touch, mouse and keyboard,
honour reduced motion, and stay legible over both day and night scenes.
