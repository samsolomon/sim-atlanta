# Everyday vehicles

[Seven silhouette studies](lineup.png) · [Four retained traffic models](retained.png)

Compare the roof, glass opening, hood and rear overhang in one blue-gray paint. Each plate uses fixed metres per pixel across its rows. The longer utility plate uses a wider field to include the complete semi.

| Shape reference | Length × width × roof height, m | Wheelbase, m | Feature to judge |
|---|---|---:|---|
| Camry-like sedan | 4.88 × 1.84 × 1.45 | 2.82 | Low hood, separate trunk deck |
| CR-V-like compact crossover | 4.59 × 1.85 × 1.67 | 2.66 | High rear-quarter lamps tracing the sloped hatch pillar |
| RAV4-like alternate | 4.60 × 1.87 × 1.69 | 2.69 | Taller shoulder and more upright rear glass |
| Model Y-like electric crossover | 4.75 × 1.92 × 1.62 | 2.89 | Continuous arched roof tapering into a short tail |
| R2-like upright SUV | 4.72 × 1.91 × 1.76 | 2.94 | Horizontal roof, square cargo volume and nearly vertical hatch |
| F-150-like crew-cab pickup | 5.89 × 2.03 × 1.97 | 3.69 | Separate open bed, vertical cab back and tall nose |
| I-PACE-inspired robotaxi concept | 4.68 × 1.90 × 1.56 | 2.99 | Cab-forward body and raised roof sensor with a dark band under its pale crown |

These are rounded design dimensions. The robotaxi dome adds an estimated 0.38 m above the roof. Shoulder width, track, glass openings and equipment dimensions are visual estimates. The sedan and alternate use manufacturer dimensions as guides. [Camry specifications](https://pressroom.toyota.com/2017-naias-detroit-toyota-camry/) · [RAV4 specifications](https://pressroom.toyota.com/all-new-2019-toyota-rav4-serves-breakthrough-debut-nyias/)

## Photographic references

A low hood leads into a sloped windshield. The roof narrows above the shoulder, and the back glass ends ahead of a distinct trunk. [Front](https://global.toyota/pages/news/images/2017/07/10/1330/cmrh1707_04_s.jpg) · [Side](https://global.toyota/pages/news/images/2017/07/10/1330/cmrh1707_17_s.jpg) · [Rear](https://global.toyota/pages/news/images/2017/07/10/1330/cmrh1707_10_s.jpg)

### RAV4 alternate

The higher hood and belt line shorten the apparent glass height. A longer roof ends near the rear axle overhang, with a steep liftgate and larger tyres. [Front](https://global.toyota/pages/news/images/2018/03/28/1301/20180328_01_02_s.jpg) · [Side](https://global.toyota/pages/news/images/2018/03/28/1301/20180328_01_03_s.jpg) · [Rear](https://global.toyota/pages/news/images/2018/03/28/1301/20180328_01_04_s.jpg)

### Compact crossover

High rear lamps turn upward beside the quarter glass. [Front and side](https://commons.wikimedia.org/wiki/File:2018_Honda_CR-V_%28RW_MY18%29_%2BSport_2WD_wagon_%282018-10-22%29_01.jpg) · [Rear and side](https://commons.wikimedia.org/wiki/File:2018_Honda_CR-V_1.5_Turbo_Prestige_RW1_%2820211006%29_02.jpg)

### Rounded electric crossover

The front glass starts well forward and the roof falls continuously to the rear. [Front and side](https://commons.wikimedia.org/wiki/File:2024_Tesla_Model_Y_RWD_front.jpg) · [Rear and side](https://commons.wikimedia.org/wiki/File:2024_Tesla_Model_Y_RWD_rear.jpg)

### Upright SUV

A tall side window and broad, near-level roof carry through to the tail. [Front and side](https://commons.wikimedia.org/wiki/File:RivianR2.jpg) · [Rear and side](https://commons.wikimedia.org/wiki/File:RivianR2SideRear.jpg)

### Crew-cab pickup

The cab and open bed read as separate volumes from either end. [Front and side](https://commons.wikimedia.org/wiki/File:2021_Ford_F-150_SuperCrew%2C_front_4.28.21.jpg) · [Rear and side](https://commons.wikimedia.org/wiki/File:2021_Ford_F-150_SuperCrew%2C_rear_4.28.21.jpg)

### White robotaxi concept

The published side view shows the sensor rising above the roof on a wider pale mount. The mesh uses a separate plinth, dark sensor band and crowned top. The white concept appears once in the mixed-paint composition as illustrative artwork. Its placement conveys no live position or real-world frequency. [Waymo on Uber gallery](https://waymo.com/waymo-on-uber/) · [Front](https://commons.wikimedia.org/wiki/File:Waymo_Jaguar_I-Pace_-_Front_Quarter_View_01.jpg) · [Side](https://commons.wikimedia.org/wiki/File:Waymo_Jaguar_I-Pace_-_Side_View_01.jpg) · [Rear](https://commons.wikimedia.org/wiki/File:Waymo_Jaguar_I-Pace_-_Rear_Quarter_View_01.jpg)

## Street composition and captures

The [street layout](street-layout.json) repeats passenger bodies in different paints, keeps the work van and robotaxi white, and includes the existing hatchback, box truck and semi. The RAV4-like alternate is reserved for the shape comparison. City capture and the 1.6 m street-eye comparison await the dedicated capture window. Use matched light, viewport and pose, with a native 150 m City orbit followed by a 1.6 m street-eye view.

To regenerate the design plates, install the workspace dependencies and run `python render.py` with Pillow and NumPy. The script reads the stock meshes and the two-body tractor-trailer assembly and generates both PNG plates and the street layout.
