"""Reduce the two frozen mounted-wheel controls against the portable NR profile."""

import argparse
import json
from pathlib import Path
from statistics import mean

HERE = Path(__file__).resolve().parent
CONTROLS = [("49.701", 0, 5.95), ("50.401", 1, 8.05)]


def projected_height(rows, x, z):
    """Interpolate bed height at the nearest point on this specific carrier."""
    best_distance = float("inf")
    height = None
    for a, b in zip(rows, rows[1:]):
        dx, dz = b[1] - a[1], b[3] - a[3]
        t = max(0, min(1, ((x - a[1]) * dx + (z - a[3]) * dz) / (dx*dx + dz*dz)))
        distance = (a[1] + t * dx - x)**2 + (a[3] + t * dz - z)**2
        if distance < best_distance:
            best_distance = distance
            height = a[2] + t * (b[2] - a[2])
    return height


def inspect(directory):
    profile = json.loads((HERE / "north-line-profile.json").read_text())
    rows = next(p["rows"] for p in profile if p["track"] == "NR")
    for time, index, axle in CONTROLS:
        log = json.loads((directory / f"contact-13-00-{time}.json").read_text())
        car = next(c for c in log["wheels"] if c["index"] == index)
        gaps = {}
        profile_errors = []
        for tread in car["treads"]:
            centre = next(sample for sample in tread["samples"] if sample["dx"] == 0)
            gap = centre["gap"]
            if gap is None:
                raise ValueError(f"Missing rail hit at {time}, axle {tread['z']}, side {tread['side']}")
            gaps.setdefault(tread["z"], []).append(gap)
            x, y, z = centre["xyz"]
            if z < -5700:
                profile_errors.append(y - gap - (projected_height(rows, x, z) + 0.07))
        # A single rigid height/pitch adds a line in local z. Find the best possible
        # worst residual at these fixed XY footprints (minimax line with free intercept).
        points = sorted((z, mean(v)) for z, v in gaps.items())
        slopes = [(b-a)/(v-u) for i, (u, a) in enumerate(points) for v, b in points[i+1:]]
        def residual(slope):
            ds = [g - slope*z for z, g in points]
            return (max(ds) - min(ds)) / 2
        rigid = min(map(residual, slopes))
        print(f"08:00:{time} car {index+1}, axle {axle:+.2f} m: "
              f"centre gaps {[round(g*100, 3) for g in gaps[axle]]} cm; "
              f"north drawn/profile top max delta {max(map(abs, profile_errors))*1000:.2f} mm; "
              f"best single rigid line worst residual {rigid*100:.2f} cm")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, help="directory of original ffadf4f5 contact JSON logs")
    inspect(parser.parse_args().directory)
