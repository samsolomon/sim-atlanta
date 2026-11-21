"""Run from the repo with blender -b -P pipeline/scripts/art/render_block.py."""

import json
import math
from pathlib import Path
from time import monotonic

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "data/raw/art"
spec = json.loads((ROOT / "web/src/artmap/camera.json").read_text())
start = monotonic()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT / "world.glb"))
scene = bpy.context.scene
scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "METAL"
prefs.refresh_devices()
for device in prefs.devices:
    device.use = device.type == "METAL"
scene.cycles.device = "GPU" if any(d.use for d in prefs.devices) else "CPU"
scene.cycles.samples = 12
scene.cycles.max_bounces = 3
scene.cycles.use_denoising = True
scene.world = bpy.data.worlds.new("Warm paper sky")
scene.world.use_nodes = True
sky = scene.world.node_tree.nodes["Background"]
sky.inputs[0].default_value = (0.73, 0.82, 1.0, 1)
sky.inputs[1].default_value = 0.8
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.energy = 2.3
sun.data.color = (1, 0.89, 0.73)
sun.data.angle = math.radians(8)
sun.rotation_euler = Vector((0.58, 0.36, -1)).to_track_quat("-Z", "Y").to_euler()

# glTF Y up becomes Blender Z up. In scene space positive z points south.
x, y, z = spec["target"]
target = Vector((x, -z, y))
az, el = map(math.radians, (spec["azimuth"], spec["elevation"]))
offset = Vector(
    (math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el))
)
bpy.ops.object.camera_add(location=target + 1800 * offset)
cam = bpy.context.object
cam.rotation_euler = (-offset).to_track_quat("-Z", "Y").to_euler()
cam.data.type = "ORTHO"
cam.data.ortho_scale = spec["width"] * spec["metresPerPixel"]
cam.data.clip_end = 4000
scene.camera = cam
scene.render.resolution_x = spec["width"]
scene.render.resolution_y = spec["height"]
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.view_settings.view_transform = "Standard"
layer = scene.view_layers[0]
layer.use_pass_position = True
layer.use_pass_normal = True
layer.use_pass_z = True
scene.render.image_settings.media_type = "MULTI_LAYER_IMAGE"
scene.render.image_settings.use_exr_interleave = True
scene.render.image_settings.file_format = "OPEN_EXR_MULTILAYER"
scene.render.image_settings.color_depth = "32"
scene.render.image_settings.exr_codec = "ZIP"
scene.render.filepath = str(OUT / "block.exr")
bpy.ops.render.render(write_still=True)
elapsed = round(monotonic() - start, 2)
(OUT / "render-stats.json").write_text(
    json.dumps(
        {
            "seconds": elapsed,
            "device": scene.cycles.device,
            "samples": scene.cycles.samples,
        }
    )
)
print(f"Rendered in {elapsed}s on {scene.cycles.device}")
