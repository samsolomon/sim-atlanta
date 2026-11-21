"""Ink and index the Blender render. Publish a static pyramid and a surface-height map."""

import json
import shutil
from pathlib import Path

import numpy as np
import OpenEXR
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "data/raw/art"
PUBLIC = ROOT / "web/public/art"
# Ink, cool masonry, paper, steel/glass, vegetation, timber/brick, and road paint.
PALETTE = [
    "262936",
    "383b46",
    "484951",
    "555862",
    "676973",
    "7e8187",
    "999b9a",
    "b2b2a8",
    "c4c2b2",
    "d4d1bf",
    "e4dfcf",
    "f2eddd",
    "415363",
    "556c79",
    "758b95",
    "99adb2",
    "48543d",
    "596b48",
    "718356",
    "889763",
    "9faa72",
    "b4ba84",
    "604737",
    "80563e",
    "a46b4e",
    "bc8260",
    "cc9b71",
    "d9ba87",
    "a54e3d",
    "c36946",
    "d1ab54",
    "f4cf76",
]
PAPER = (228, 223, 207)
TILE = 512


def pyramid(im, style):
    path = PUBLIC / style
    levels = [im]
    while max(levels[-1].size) > TILE:
        last = levels[-1]
        levels.append(
            last.resize(
                tuple((n + 1) // 2 for n in last.size), Image.Resampling.LANCZOS
            )
        )
    count = 0
    for z, level in enumerate(reversed(levels)):
        folder = path / str(z)
        folder.mkdir(parents=True, exist_ok=True)
        for y in range(0, level.height, TILE):
            for x in range(0, level.width, TILE):
                box = (x, y, min(x + TILE, level.width), min(y + TILE, level.height))
                level.crop(box).save(
                    folder / f"{x // TILE}-{y // TILE}.png", optimize=True
                )
                count += 1
    return count


def finish():
    PUBLIC.mkdir(parents=True, exist_ok=True)
    channels = OpenEXR.File(str(RAW / "block.exr"), separate_channels=True).channels()

    def channel(name):
        return channels[next(k for k in channels if k.endswith("." + name))].pixels

    alpha = channel("Combined.A")
    inside = alpha > 0.5
    linear = np.stack([channel("Combined." + c) for c in "RGB"], axis=-1)
    srgb = np.maximum(linear, 0) ** (1 / 2.4) * 1.055 - 0.055
    rgb = np.clip(srgb * 255, 0, 255)
    rgb[~inside] = PAPER
    # One-pixel ink on the further side of a silhouette, and lighter normal creases.
    depth = channel("Depth.Z")
    normal = np.stack([channel("Normal." + c) for c in "XYZ"], axis=-1)
    ink = np.zeros(alpha.shape, np.float32)
    for axis in (0, 1):
        for shift in (-1, 1):
            neighbour = np.roll(inside, shift, axis)
            jump = depth - np.roll(depth, shift, axis)
            crease = (normal * np.roll(normal, shift, axis)).sum(axis=2) < 0.75
            ink = np.maximum(ink, np.where(neighbour & (jump > 1.6), 0.52, 0))
            ink = np.maximum(ink, np.where(inside & neighbour & crease, 0.22, 0))
    rgb = rgb * (1 - ink[:, :, None]) + np.array([48, 47, 53]) * ink[:, :, None]
    pal = Image.new("P", (1, 1))
    colors = bytes.fromhex("".join(PALETTE))
    pal.putpalette(colors + colors[:3] * (256 - len(PALETTE)))
    im = Image.fromarray(rgb.astype(np.uint8)).quantize(
        palette=pal, dither=Image.Dither.NONE
    )
    im.save(RAW / "blender.png", optimize=True)
    Image.fromarray(inside).save(RAW / "mask.png")
    # Absolute elevation in centimetres biased by 32768, packed high byte first.
    height = (
        np.rint(channel("Position.Z") * 100 + 32768).clip(1, 65535).astype(np.uint16)
    )
    height[~inside] = 0
    packed = np.stack(
        [height >> 8, height % 256, np.zeros_like(height)], axis=-1
    ).astype(np.uint8)
    Image.fromarray(packed).save(PUBLIC / "surface.png", optimize=True)
    count = pyramid(im, "blender")
    for name in ["day.png", "night.png", "height.png", "routes.json"]:
        shutil.copyfile(RAW / name, PUBLIC / name)
    (PUBLIC / "layers.json").write_text(json.dumps(["blender"]))
    print(f"{im.size}, {count} pyramid tiles, {len(im.getcolors())} colours")


if __name__ == "__main__":
    import sys

    if "--ai" in sys.argv:
        print(pyramid(Image.open(RAW / "ai.png"), "ai"), "AI tiles")
        (PUBLIC / "layers.json").write_text(json.dumps(["blender", "ai"]))
    else:
        finish()
