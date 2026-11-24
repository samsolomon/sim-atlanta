# Coda at Tech Square

Research 2026-11-23 in fresh Orca tab 357c44f4-fbe2-4ef4-a164-5b2c6fc93fb5.

- https://aiaga.org/design-award/coda/ — architect design entry. Day front photo 01_Exterior_2019DavidNaughton-scaled.jpg; reverse aerial 06_Exterior_2019DavidNaughton-scaled.jpg under https://storage.googleapis.com/hu6g4al9cdte0xah/sites/8/2020/02/. Front shows retained brick/stone Crum & Forster face, red hipped tile roof; silver curtain wall, cantilever with open slot beneath, dark horizontal floor bands, rounded collaboration core. Aerial verifies L-shaped tower and lower service/data-center volume. Entry reports 63-foot arcade (19.2 m).
- https://luxetveritasdesign.com/portfolio/coda-tech-square/ — actual night photos by Portman Archives / David Naughton. Viewed Exterior6, Exterior5, Exterior4 at https://luxetveritasdesign.com/wp-content/uploads/2023/08/CODA_Exterior6-1024x702.webp (the passage and piazza photographs are linked below). White line lights under arcade, illuminated glass lobby/core, scattered lit office floors, suspended globes in piazza, under-seat and stair-edge strips. No continuous luminous tower outline. Display imagery must be abstract, not copied.
- OSM way714119667 mapped L plan x272.04..380.09 z-2435.77..-2368.66 h118.9,21floors. Way42792936 retained Crum & Forster x274.28..290.11 z-2437.06..-2412.51. Both inside board. No existing model found by git grep.
- Coordinator confirmed no Coda smokestack. Add separate Georgia Tech central utility plant stack backlog candidate with source; model later only after board-bound check.

Implementation plan: use mapped L shell with lower glazed podium, elevated upper bridge over open 19.2m passage, dark blue curtain wall with silver mullions, recessed south slot under cantilever, rounded glass collaboration core, restrained night occupancy; preserved Crum & Forster as separate mapped building dispatch using brick/granite/tile library materials. Keep true open passage, no solid foundation wall spanning its opening. Ground-following plaza/stairs only with carved yield. Batched shell and lighting geometry, procedural materials, no textures. The tower also has one translucent gallery mesh. Capture before and after both tiers with same camera and clock, plus reverse daylight for passage.

Architect review — 2026-11-23: existing localLandmarkShell is suitable and retains generic fallback for missing ground/ring. Significant plan correction: Coda and Crum & Forster are disjoint mapped ways, so each must be independently dispatched rather than swallowing an adjacent building via Coda's callback. AIA ground-floor plan confirms open east/west passage; omit the generic full-footprint plinth across this opening. Normalize ring winding before facade offsets. Any new plaza must preserve terrain continuity rather than float above grade.

Product design review — 2026-11-23: no new UI, labels or interactions needed. Model identity rests on the cantilever, slot, rounded glass core and preserved brick facade, not logos or video-screen artwork. Night occupancy/brightness is illustrative; evidence establishes fixture placement only. Use restrained white passage strips and a few window panels rather than a uniformly glowing tower. Keep the GT stack separate per coordinator's correction.

### City model

The archive supplies the 118.9 m tower and the 23.33 m, five-floor computing
center. The 19.2 m arcade clearance follows the architect's description. The
podium inset, collaboration core radius (6 m), upper slot (4 m), historic
cornice (11.5 m) and tile ridge (15 m) are estimates from the photographs.
The historic entrance faces west with three masonry arches. The computing
center's louver spacing and rooftop equipment are illustrative. Sparse office
occupancy and the brightness of the white soffit strips are also estimates.

Matched City camera `326,-2402,245,45,840`, November 20 at 14:00 and 21:00
Eastern. [Day high](log/ui/coda/high-day.jpg) · [night high](log/ui/coda/high-night.jpg)
· [day low](log/ui/coda/low-day.jpg) · [night low](log/ui/coda/low-night.jpg).
[West overview](log/ui/coda/west-day.jpg), camera `326,-2402,98,48,795`.
[Crum & Forster entry](log/ui/coda/front-day.jpg), camera `281,-2425,65,62,110`.

### Daylight and passage revision

At an 840 m orbit the original dark panes concealed the tower's floor divisions.
The revised glazing uses a silver mullion field and lighter blue-grey panes. Above
the main office floors the two wings step back separately; the west wing carries
the projecting cap. The setback widths and elevations are photo estimates.
The west gallery now reaches from the rear of Crum & Forster to the tower podium.
Its narrow glazed roof and columns leave the rest of the passage open. Lobby
panels, hanging globes and white strips follow the designer's
[passage view](https://luxetveritasdesign.com/wp-content/uploads/2023/08/CODA_Exterior4-1024x768.webp)
and [piazza view](https://luxetveritasdesign.com/wp-content/uploads/2023/08/CODA_Exterior5-1024x736.webp).


[Revised day comparison](log/ui/coda/revision-day.jpg) · [revised night comparison](log/ui/coda/revision-night.jpg).
Passage camera `319,-2403,80,71,150` at [14:00](log/ui/coda/passage-day.jpg)
and [21:00](log/ui/coda/passage-night.jpg). The blue-grey gallery panels are
translucent, with continuous thin edge rails. Their opacity is estimated.
