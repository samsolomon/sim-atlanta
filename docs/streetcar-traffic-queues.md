# Arterial cars behind the streetcar

Illustrative downtown arterial cars can follow a scheduled streetcar in the same
lane. The historical sampler uses the same timetable and GTFS path distances as
the drawn S70, including at the real clock: live MARTA rail does not replace the
streetcar timetable. No upstream requests or new data files are needed.

A course binds only where its direction aligns with the rail (dot product at
least 0.85), its lane is within 2.4 m, and the surfaces differ by less than 2.5 m.
Each blocker uses the streetcar's real 24.11 m model length, converted from GTFS
chainage to drawn metres. Rear and front must both project forward onto the
course. The current fixtures enable three downtown courses. Adjacent lanes,
opposing/crossing roads and overhead roads are excluded. Connector and Midtown
traffic retain their existing behaviour.

The queue advances on a globally aligned half-second grid, from the earliest
entry in the current trip cohort. Each car moves at most its course speed, stops
at red/amber, waits behind the streetcar and leaves a 2 m bumper gap behind its
leader. Signals are evaluated at the car's delayed arrival, so missing a green
behind the streetcar does not let it pass the next red. Fractional frames
interpolate immutable grid checkpoints, bounded by the signal's release time.
Forward updates resume cached checkpoints. When a slot changes during playback,
the course replays up to 64 half-second steps per frame. Surviving trips hold
their drawn positions and new trips appear once replay catches the clock.
The resulting positions match a fresh load. Cold loads, backward seeks and
forward jumps exceeding 16 simulated seconds resolve immediately.

Historical streetcar poses are cached only at grid times. The shared cache retains
the longest bound course's slot period plus one minute, with 2,400–7,200 samples.
Courses requiring more than the hard maximum retain skip-draw. Each queue gets
180 s of additional offstage allowance, excluded from the visible-car demand
calculation. Exceptionally long delays can still outlast a slot's lifecycle.

This remains an illustrative model. Streetcars follow their timetable and do not
yield to traffic. A streetcar entering across a car's path, or continuing through
a road red light, can still trigger the last-resort overlap guard. Turns and through
courses do not share queues. Curved sections that cannot match both streetcar
ends also retain that guard. Live buses still use occupancy suppression, not this
historical queue. No additional truth-tier labels are added.

The Edgewood review frame is `cam=588,-65,0,50,100`,
`t=2026-11-20T17:08:23Z&speed=0&q=high&dev&mindist=20`.
Release requires a web rebuild only, not `pnpm data` or a worker change.

[Edgewood BEFORE | AFTER](log/ui/streetcar-queues/edgewood-compare.jpg) ·
[Low-tier night](log/ui/streetcar-queues/edgewood-low-night.jpg).

A 10,800-frame browser probe over three minutes of evening scene time measured
0.3 ms median and 0.6 ms p99 for the full arterial update. The slowest warm update
was 4.3 ms; frame zero after a clock jump took 45 ms. These are development-machine
measurements, not a phone performance claim. Both City budget tiers passed with
all 12 areas mounted.
