# East Portal art factory

Run from the repository root on an Apple Silicon Mac with Blender 5.3 and Chrome. The source is the Railwatch vignette built from MARTA GTFS, Overture, FHWA and the Meta/WRI canopy map. All colours, simulated vehicles, facade panes and shadows are illustrative.

## Blender and sprite sheets

Install the README data dependencies, then install the two capture/finishing packages in the same venv.

```sh
pnpm install
.venv/bin/pip install playwright OpenEXR
pnpm data
pnpm data:vignette
pnpm dev
```

With Vite listening on localhost:5173, run the bake in a second terminal.

```sh
.venv/bin/python pipeline/scripts/art/capture.py
blender -b --python-exit-code 1 -P pipeline/scripts/art/render_block.py
.venv/bin/python pipeline/scripts/art/finish.py
```

The development-only export hook freezes the season at 1 p.m. EST on 20 November 2026. It expands instanced static geometry with instance and vertex colours, adds the traffic model's painted lane dashes, and bakes simplified facade panes. It emits a separate orthographic Three.js reference with vehicles. The world GLB, full-resolution Blender PNG and multilayer EXR are in `data/raw/art/`.

All three stages read the same framing from `web/src/artmap/camera.json`. The camera sits 28° west of the positive scene-z axis and looks down at 38°, aiming at scene (725, 12, 370) m. Positive x is east and positive z is south. One image-plane pixel spans 0.25 m. Cycles uses a warm 8° sun, cool ambient illumination and diffuse bounces for contact shadows. The finish adds ink to depth breaks and normal creases before quantization. The exact 32 sRGB swatches are in `finish.py`, in groups of ink/masonry, paper/glass, foliage and clay/road paint.

The transparent sheets use 128 px cells at the same scale. Each model occupies four rows of eight headings, starting at positive z and increasing clockwise as viewed in scene x/z coordinates from +z toward +x. The five models are a CQ400-style cab and middle car, sedan, pickup and box truck. The 32 day frames and 32 night frames per model share a local height sheet. The viewer compares each drawn pixel's elevation to the Blender surface so trains pass behind facades and cars disappear beneath the viaduct.

## Optional local redraw

Use a separate Python 3.12 venv. The local model folder is gitignored. Selected fp16 weights total approximately 7.1 GB including the adapter. Licence terms are in the model cards. [SDXL base 1.0](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0) · [Pixel Art XL](https://huggingface.co/nerijs/pixel-art-xl)

```sh
python3.12 -m venv data/raw/art-models/env
source data/raw/art-models/env/bin/activate
pip install torch diffusers transformers accelerate peft pillow numpy
hf download stabilityai/stable-diffusion-xl-base-1.0 --revision 462165984030d82259a11f4367a4eed129e94a7b \
  --include 'model_index.json' 'scheduler/*.json' 'tokenizer/*' 'tokenizer_2/*' \
  'text_encoder/config.json' 'text_encoder_2/config.json' 'unet/config.json' 'vae/config.json' \
  'text_encoder/model.fp16.safetensors' 'text_encoder_2/model.fp16.safetensors' \
  'unet/diffusion_pytorch_model.fp16.safetensors' 'vae/diffusion_pytorch_model.fp16.safetensors' \
  --local-dir data/raw/art-models/sdxl
hf download nerijs/pixel-art-xl pixel-art-xl.safetensors --revision 8bf4a4d9ea283e00a51fafda8e0539f8248ea037 \
  --local-dir data/raw/art-models/pixel
python pipeline/scripts/art/redraw.py --trial
python pipeline/scripts/art/redraw.py
deactivate
.venv/bin/python pipeline/scripts/art/finish.py --ai
```

The trial uses a 1024 px crop of the viaduct. The full run caches each completed window in a folder keyed by denoise strength and a fingerprint of the input art, silhouette and rendering script. The script records per-window timings and writes a stitched PNG. Overlapping outputs use separable feather weights and the original board silhouette. This blends colour across boundaries but permits inconsistent details on neighbouring windows.

## Viewer and deployment

Open `/artmap.html` after baking. Drag or use arrow keys to pan. Wheel or press the zoom buttons to change scale. The base selector compares Blender with the optional AI layer. Day/night controls the sprites. The baked base has fixed daylight. The default sprite lighting uses Atlanta's sun elevation, and `?at=<ISO>` sets the lighting reference time. Motion is an illustrative loop.

The viewer reads only static assets from `web/public/art/`. The pyramid has five levels of 512 px tiles with cropped edges. `surface.png` encodes visible surface elevation in centimetres as `(R * 256 + G - 32768)`, with zero for empty pixels. The image is registered to level 4. For a deployment, bake or copy the complete generated art directory **before** running `pnpm build`, then redeploy the resulting `web/dist` through the existing hosting path. Model weights, source GLBs, EXRs and runtimes stay on the Studio.

The measured run used torch 2.15.0, diffusers 0.43.0, transformers 5.23.0 and peft 0.22.0. SDXL base 1.0 is licensed under CreativeML Open RAIL++-M and Pixel Art XL under CreativeML Open RAIL-M. The full bake used denoise 0.26 with a fixed coordinate-derived seed. A 28-step Euler schedule at that strength applies seven denoising steps.
