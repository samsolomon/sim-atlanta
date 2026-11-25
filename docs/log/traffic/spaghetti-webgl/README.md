# Spaghetti Junction WebGL visibility check

The four stations where road paint previously obscured the car in the offline canvas preview show the full projected car in the development WebGL replay. The tile cut at 985.204 m gives the same result. [Low-camera drive](drive.mp4) · [Cut frame](station-985.204.png)

| Station from gore | Camera | Car pixels visible | Isolated car pixels |
|---:|---|---:|---:|
| 899 m | Chase | 21,816 | 21,816 |
| 905 m | Chase | 21,816 | 21,816 |
| 983.2 m | Chase | 20,870 | 20,870 |
| 985.204 m, cut | Chase | 20,880 | 20,880 |
| 989.2 m | Chase | 20,620 | 20,620 |
| 741.592 m, under the flyover | Chase | 23,093 | 23,093 |
| 741.592 m, same vehicle pose | Overhead | 43 | 4,200 |

Removing paint changed none of the counts. At 741.592 m the chase camera is beneath the upper deck and sees the whole car. Looking down from above, way 41051928 occludes 4,157 of 4,200 pixels. Removing that deck and its markings restores all 4,200. The remaining 43 pixels were visible in the overhead frame. [Overhead frame](station-741.592-upper.png) · [Station measurements and exact camera vectors](stations.json)

The tested fixture is commit `05bc62fb` with the accepted ramp geometry from `cfaeddf0`. The capture driver is from `88a4e582`. To reproduce, use the page and bake at the tested commit and run that capture driver against it. The camera at the tested commit uses a **52° vertical field of view**, 0.2 m near and 1,500 m far planes, at 960 × 540. The chase eye follows 9 m behind and 3.2 m above the lane tread, looking 3 m ahead and 1.15 m above it. The overhead control looks down from 28 m above the tread. The 133-frame clip covers 727–1,002 m at 25 m/s and 12 fps.

Pixel counts come from paired actual-material WebGL render-target reads with the car shown and hidden, repeated with paint, the upper deck, or all roads omitted. This development fixture uses the City deck material, RoadTraffic instance and axle-height path, accepted off-map triangles and fixture-generated markings. The test covers these cameras and stations.
