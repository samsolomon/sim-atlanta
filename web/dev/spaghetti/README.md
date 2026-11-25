# Spaghetti Junction WebGL depth check

The fixture consumes the accepted `cfaeddf0` clipped tread triangles. It runs as a standalone development page using the City's SurfaceTransport deck material, palette, RoadTraffic course, instance shader, axle placement and triangle-height sampler. Its course follows the inferred leftmost lane. Its marking mesh uses the fixture cross-sections and City's 3 cm paint lift. Materials use their normal depth tests and depth writes.

From the repository root, bake the geometry locally and start the web dev server. The JSON is ignored and this page has no release entry point.

```sh
.venv/bin/python -B pipeline/prototypes/preclip-transport/spaghetti/bake.py > web/dev/spaghetti/bake.json
pnpm --dir web exec vite --host 127.0.0.1 --port 5837 --strictPort
```

Open `http://127.0.0.1:5837/dev/spaghetti/?s=985.204`. Station is in metres from the gore. The 960 × 540 chase view uses a 66° vertical field of view, near plane 0.18 m and far plane 20,000 m. Its eye is 9 m behind the lane position and 3.2 m above the tread. The target is 3 m forward and 1.15 m above the tread. For the upper-deck control the camera looks vertically down from 28 m above the car's tread.

During an assigned Studio capture window, run the recording script against that dev server:

```sh
node web/dev/spaghetti/capture.mjs http://127.0.0.1:5837/dev/spaghetti/ /tmp/spaghetti-webgl-frames
ffmpeg -framerate 12 -i /tmp/spaghetti-webgl-frames/drive-%03d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart /tmp/spaghetti-drive.mp4
```

The script seeks a single seeded traffic vehicle at 25 m/s from station 727 through 1002. For each pinned camera, it measures the pixels changed by drawing the actual car. It repeats the measurement with markings hidden, with just upper deck 41051928 and its markings hidden, and with all roads hidden. This distinguishes the car's visible pixels, restoration by removing the occluder, and the projected silhouette. The station JSON includes actual camera positions and directions.
