"""SDXL img2img on Apple Metal. Run with the art-models venv, after finish.py."""

import argparse
import hashlib
import json
from pathlib import Path
from time import monotonic

import numpy as np
import torch
from diffusers import StableDiffusionXLImg2ImgPipeline
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "data/raw/art"
MODELS = ROOT / "data/raw/art-models"
TILE, STRIDE = 1024, 768
PROMPT = "pixel art, detailed isometric miniature of downtown Atlanta, railway viaduct, concrete roads, brick facades, autumn foliage, precise architectural illustration, limited warm palette"
NEGATIVE = "text, lettering, logos, aerial photograph, new buildings, changed streets, fantasy towers, blurry"
BASE_REV = "462165984030d82259a11f4367a4eed129e94a7b"
LORA_REV = "8bf4a4d9ea283e00a51fafda8e0539f8248ea037"


def starts(length):
    return sorted({*range(0, length - TILE, STRIDE), length - TILE})


def weights(start, length):
    w = np.ones(TILE, np.float32)
    ramp = np.linspace(0, 1, TILE - STRIDE, dtype=np.float32)
    if start:
        w[: len(ramp)] = ramp
    if start + TILE < length:
        w[-len(ramp) :] = ramp[::-1]
    return w


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--trial", action="store_true")
    parser.add_argument("--strength", type=float, default=0.26)
    args = parser.parse_args()
    source = Image.open(RAW / "blender.png").convert("RGB")
    mask = np.array(Image.open(RAW / "mask.png"), dtype=bool)
    assert torch.backends.mps.is_available(), "Local Metal GPU required"
    pipe = StableDiffusionXLImg2ImgPipeline.from_pretrained(
        MODELS / "sdxl",
        variant="fp16",
        torch_dtype=torch.float16,
        local_files_only=True,
        add_watermarker=False,
    )
    pipe.load_lora_weights(
        str(MODELS / "pixel"),
        weight_name="pixel-art-xl.safetensors",
        adapter_name="pixel",
    )
    pipe.set_adapters("pixel", adapter_weights=0.85)
    pipe.to("mps")
    pipe.vae.enable_tiling()
    pipe.set_progress_bar_config(disable=True)
    w, h = source.size
    fingerprint = hashlib.sha256(
        Path(__file__).read_bytes()
        + (RAW / "blender.png").read_bytes()
        + (RAW / "mask.png").read_bytes()
    ).hexdigest()[:12]
    out = RAW / f"redraw-{args.strength}-{fingerprint}"
    out.mkdir(exist_ok=True)
    coords = (
        [(2304, 768)] if args.trial else [(x, y) for y in starts(h) for x in starts(w)]
    )
    sums = np.zeros((h, w, 3), np.float32)
    counts = np.zeros((h, w), np.float32)
    for x, y in coords:
        region = np.s_[y : y + TILE, x : x + TILE]
        if not mask[region].any():
            continue
        path = out / f"{x}-{y}.png"
        if not path.exists():
            start = monotonic()
            generator = torch.Generator(device="cpu").manual_seed(8721 + x + y * w)
            image = pipe(
                prompt=PROMPT,
                negative_prompt=NEGATIVE,
                image=source.crop((x, y, x + TILE, y + TILE)),
                generator=generator,
                strength=args.strength,
                num_inference_steps=28,
                guidance_scale=5.5,
            ).images[0]
            if np.asarray(image).std() < 3:
                raise RuntimeError("Flat AI output")
            torch.mps.synchronize()
            seconds = round(monotonic() - start, 2)
            tmp = path.with_suffix(".tmp.png")
            image.save(tmp)
            path.with_suffix(".json").write_text(
                json.dumps({"x": x, "y": y, "seconds": seconds})
            )
            tmp.replace(path)
            print(path.name, seconds, flush=True)
        if args.trial:
            return
        factor = weights(y, h)[:, None] * weights(x, w)[None, :]
        sums[region] += np.asarray(Image.open(path).convert("RGB")) * factor[:, :, None]
        counts[region] += factor
    result = np.array(source)
    result[mask] = (sums[mask] / counts[mask, None]).clip(0, 255).astype(np.uint8)
    Image.fromarray(result).save(RAW / "ai.png")
    records = [json.loads(p.read_text()) for p in out.glob("*.json")]
    (RAW / "ai-stats.json").write_text(
        json.dumps(
            {
                "model": BASE_REV,
                "lora": LORA_REV,
                "strength": args.strength,
                "steps": 28,
                "guidance": 5.5,
                "adapter": 0.85,
                "tiles": records,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
