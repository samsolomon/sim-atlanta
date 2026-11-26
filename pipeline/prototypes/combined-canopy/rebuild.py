"""Recreate the three northern release contexts from pinned OSM, DEM and canopy inputs."""
import argparse
import gzip
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

pack = Path(__file__).resolve().parent
prototypes = pack.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("dem_dir", type=Path, help="Directory containing x74y374.tif and x74y375.tif")
parser.add_argument("canopy", type=Path, help="Atlanta UTCMosaic2023.tif")
parser.add_argument("output", type=Path, help="New build directory")
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=False)
inputs = args.output / "source"
inputs.mkdir()
for name in ("x74y374.tif", "x74y375.tif"):
    (inputs / name).symlink_to((args.dem_dir / name).resolve(strict=True))
(inputs / "r16.json.gz").symlink_to(prototypes / "r16-offline/r16.json.gz")

def run(script, *arguments):
    subprocess.run([sys.executable, str(script), *map(str, arguments)], check=True)

base = args.output / "base"
rows = Path("scene/square-board")
run(prototypes / "r16-offline/proof.py", inputs, base / rows)
# The R16 baker also installs its tracked Station neighbour.
shutil.copytree(prototypes / "square-board/brookwood-south", base / rows / "brookwood-south")
detail = args.output / "approved"
shutil.copytree(base / rows, detail / rows)
course = prototypes / "ansley-mounted"
run(course / "stage.py", base, detail, course / "ansley-mounted-source.json",
    course / "ansley-tree-map.json", base / rows / "proof.json")
crowns = args.output / "r16-crowns.json"
run(pack / "bake_r16.py", args.canopy, inputs / "r16.json.gz", pack / "source/nr-path.json",
    detail / rows, crowns, args.output / "r16-canopy-audit.json")
path = detail / rows / "r16/context.json"
context = json.loads(path.read_bytes())
context.update(json.loads(crowns.read_bytes()))
context.pop("treePlan", None)
context.update(treeSource="City of Atlanta / Georgia Tech 2023 Urban Tree Canopy; Meta & WRI canopy heights (Tolan et al., 2024, CC BY 4.0). Crown centers, radii, heights and tier selection inferred.")
path.write_text(json.dumps(context, separators=(",", ":")) + "\n")
for row, expected in json.loads((pack / "rows.sha256.json").read_bytes()).items():
    for name, digest in expected.items():
        payload = (detail / rows / row / name).read_bytes()
        if hashlib.sha256(payload).hexdigest() != digest:
            raise ValueError(f"Release hash mismatch for {row}/{name}")
        if name == "context.json" and gzip.decompress((pack / (row + ".json.gz")).read_bytes()) != payload:
            raise ValueError(f"Stage archive mismatch for {row}")
print("Verified all nine northern release files and the three stage archives.")
