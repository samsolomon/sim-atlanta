# Georgia State's Fairlie–Poplar block

Four Overture outlines on the block between Poplar, Fairlie and Luckie Streets now have skins:

| Building | Overture id | Mapped | Lidar roof (p50, 22 April 2019) | Ground (NAVD88) |
|---|---|---|---|---|
| Haas-Howell Building (Neel Reid, about 1920) | `12421d44-6a0e-4675-87c8-c1e7e17de9c9` | 9 floors, no height | **30.1 m**, penthouse to about 35 m | 322.9 m |
| Standard Building (1923) | `ef110bb2-753f-4530-bfe1-8509fc8958dd` | 11 floors, no height | **40.1 m**, stair and lift head to about 43 m | 320.6 m |
| Helen M. Aderhold Learning Center (Lord Aeck Sargent, 2002) | `3d0c8e4d-aa16-45b2-be69-a61ddbf62860` | 21.9 m | 3 m perimeter band at 19–20 m, roof **22 m**, plant at 25 m, skylight at 24.5 m | 322.6 m |
| Theatrical Outfit (Balzer Theater at Herren's) | `3fca5444-4a91-4894-b46f-b030c87c9aba` | **40.4 m (a phantom tower)** | **9.2 m** | 320.9 m |

The Theatrical Outfit wasn't on the list. It is in this PR because its mapped 40.4 m box stood in front of the Standard Building, and the lidar shows a 9 m theatre there.

## Sources (viewed, not copied)

- **Haas-Howell, Poplar Street.** [Street View, March 2025](https://www.google.com/maps/@33.7566294,-84.3899436,3a,75y,93.69h,90t/data=!3m4!1e1!3m2!1sNcnKlalDUcw2oIoPalOI2Q!2e0). The base is three storeys of cream limestone: tall arched openings on the ground floor, then two storeys of paired sash windows, under a belt course. Above that is a red-brown brick shaft of paired white-framed sash windows and a pale stone cornice. The entrance arch carries a garland cartouche and the building's name, which is left off.
- **Standard Building, Fairlie Street (95 Fairlie St NW).** [Street View, January 2023](https://www.google.com/maps/place/92+Luckie+St+NW,+Atlanta,+GA+30303/@33.7571986,-84.3898251,3a,75y,113.28h,90t/data=!3m4!1e1!3m2!1sWMwSlumioYiYz4aajCIDfw!2e0). It has the same formula: a two-storey pale stone base with a pedimented doorway, and a red-brown brick shaft of paired sash windows. GSU's catalogue gives 92 Luckie / 91 Fairlie, and its music handbook places offices on the 11th floor.
- **Aderhold.** Visitor photos on Google Maps (Cat Richmond, April 2017; Helena Grinberg, 2021): buff cast-stone piers, tall dark-framed windows in pairs, a ground-floor arcade with steel canopies, and a steel trellis cantilevered over the top floor. The [Lord Aeck Sargent](https://lordaecksargent.com/design/education/academic_student_life/georgia_state_university2) project page confirms five storeys meant to echo the historic district.
- **Theatrical Outfit.** A Google Maps photosphere (Genesis Visual Studios, April 2017) shows low brick with a glazed lobby and a steel canopy on Luckie Street. The marquee text is left off.

## Estimates and gaps

- The Standard's top is out of frame in every Street View I found. Its parapet is drawn as a plain stone coping, and the cornice is an estimate.
- The position of the pedimented door along Fairlie is estimated.
- The party walls are blank brick up to the lidar height of each neighbour: Rialto 22 m and shops 13 m against Haas-Howell, a 17 m neighbour and the theatre against the Standard. Windows above those heights are assumed.
- Aderhold's setback top storey is read from the lidar's 3 m perimeter band. The photos show the trellis but not the setback itself.
- Aderhold's five rooftop units are estimated: they are too small for the lidar grid. The roof deck is a darker grey.
- **Night.** I found no reliable night photos for any of the four. The offices and practice rooms are about 10% lit, Aderhold's classrooms 12%, its arcade and the theatre lobby lit.

## Recognition at 400–600 m

The block was four tan or grey boxes, one of them 40 m tall. Now it reads as two red-brick 1920s towers with pale stone bases and cornices, a low theatre, and the buff Aderhold block with its trellis rim, glass setback storey and skylight. Every feature above comes from the photos or the lidar.

## Captures (20 November 2026)

| View | Camera | Time | Capture |
|---|---|---|---|
| Before and after, 480 m | `195,-330,330,52,480` | 11:30 AM | [Before/after](before-after-480m.jpg) |
| Block, 480 m | `195,-330,330,52,480` | 11:30 AM | [Day](day.jpg) |
| Same | `195,-330,330,52,480` | 11:30 PM | [Night](night.jpg) |
| Haas-Howell cornice over Aderhold's trellis | `226,-273,120,66,150` + `&dev&mindist=20` | 11:30 AM | [Close](close-haas-howell-aderhold.jpg) |
| Standard Building, Fairlie face | `173,-361,140,62,120` + `&dev&mindist=20` | 11:30 AM | [Close](close-standard.jpg) |
| Four sides, 400 m | bearings 0/90/180/270 | 11:30 AM | [Haas-Howell](haas-howell-four-sides.jpg) · [Standard](standard-building-four-sides.jpg) · [Aderhold](aderhold-four-sides.jpg) · [Theatrical Outfit](theatrical-outfit-four-sides.jpg) |

The bearing is the view heading.
