"""Run the private City geometry probes from the repo root; emit the station CSV."""
import csv
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def main():
    with tempfile.TemporaryDirectory() as tmp:
        js = Path(tmp) / "probe.mjs"
        bundle = next(ROOT.glob("node_modules/.pnpm/esbuild@*/node_modules/esbuild/bin/esbuild"))
        subprocess.run([bundle, HERE / "probe.ts", "--bundle", "--platform=node",
                        "--format=esm", "--define:import.meta.env.DEV=false",
                        "--log-level=error", f"--outfile={js}"], check=True, cwd=ROOT)

        def run(*flags):
            return json.loads(subprocess.check_output(["node", js, *flags], cwd=ROOT))

        writer = csv.writer(sys.stdout, lineterminator="\n")
        writer.writerow(["tier","board","way","lanes","station_m","x","z","sample_width_m",
                         *[f"{state}_{col}" for state in ["before","after"]
                           for col in ["left_navd_m","centre_navd_m","right_navd_m","cross_pct","grade_pct"]]])
        for tier in ["low","high"]:
            count = 0
            max_error = 0
            for board in ["south","north"]:
                flags = ["--"+tier, "--"+board]
                before, after = (run(*flags,"--"+mode) for mode in ["before","after"])
                assert len(before) == len(after)
                previous = {}
                for a,b in zip(before,after):
                    assert (a["id"],a["s"]) == (b["id"],b["s"])
                    if a["id"] not in [369529900,1416312985]:
                        assert a["height"] == b["height"]
                    line = [tier,board,a["id"],a["lanes"],a["s"],*a["xz"],a["width"]]
                    for state, row in [("before",a),("after",b)]:
                        key = state,row["id"]
                        prev = previous.get(key)
                        grade = "" if prev is None else 100*(row["height"][1]-prev["height"][1])/(row["s"]-prev["s"])
                        line.extend([*[h+323.8 for h in row["height"]],row["crossPct"],grade])
                        previous[key] = row
                    writer.writerow([round(v,5) if isinstance(v,float) else v for v in line])
                for row in run(*flags,"--after","--wheels"):
                    if row["id"] not in [369529900,1416312985]:
                        continue
                    assert row["ray"] is not None and row["tread"] is not None
                    assert row["ray"] >= row["bare"]
                    max_error = max(max_error,abs(row["ray"]-row["tread"]))
                    count += 1
                controls = run(*flags,"--neighbors")
                assert controls and controls == run(*flags,"--after","--neighbors")
            south,north = (run("--"+tier,"--"+board,"--after","--seam") for board in ["south","north"])
            for a,b in zip(south,north):
                assert abs(a["ray"]-a["tread"]) < .00001 and abs(b["ray"]-b["tread"]) < .00001
            seam=max(abs(a['tread']-b['tread']) for a,b in zip(south,north))
            assert len(south)==len(north)==21 and seam<.001
            print(f"{tier}: 21 cross-seam cuts ±2 mm, max step {seam*1000:.3f} mm",file=sys.stderr)
            assert count == 2808 and max_error < 0.00001
            print(f"{tier}: {count} wheel hits, max lookup/ray error {1000*max_error:.6f} mm",file=sys.stderr)
        poses = run("--low","--after","--instances")
        gaps = [gap for pose in poses for gap in pose["gaps"]]
        assert len(gaps) == 72 and all(g is not None for g in gaps)
        print(f"Bounded Low replay: {len(poses)} sedan poses, wheel gaps "
              f"{1000*min(gaps):.2f} to {1000*max(gaps):.2f} mm",file=sys.stderr)


if __name__ == "__main__":
    main()
