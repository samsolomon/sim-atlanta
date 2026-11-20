"""Extract downtown Atlanta buildings, rail and roads from Overture Maps into GeoJSON.

One-time setup:  python3 -m venv .venv && .venv/bin/pip install duckdb
Run:             .venv/bin/python pipeline/scripts/extract_overture.py

Reads the public Overture S3 bucket directly (no account). Writes
data/raw/overture_downtown_{buildings,rail,roads}.geojson for `railprep scene`.
"""

import json
import pathlib
import sys

import duckdb

RELEASE = "2026-11-18.0"
# Five Points ± ~1.5 km; north edge reaches Bank of America Plaza (33.7709).
BBOX = dict(xmin=-84.406, xmax=-84.377, ymin=33.740, ymax=33.773)

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "raw"


def theme(t: str, ty: str) -> str:
    return f"s3://overturemaps-us-west-2/release/{RELEASE}/theme={t}/type={ty}/*"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect()
    con.execute(
        "INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; "
        "SET s3_region='us-west-2'; SET geometry_always_xy = true;"
    )
    where = (
        f"bbox.xmax > {BBOX['xmin']} AND bbox.xmin < {BBOX['xmax']} "
        f"AND bbox.ymax > {BBOX['ymin']} AND bbox.ymin < {BBOX['ymax']}"
    )

    queries = {
        "buildings": f"""
            SELECT id, height, num_floors, sources[1].dataset AS src, ST_AsGeoJSON(geometry) AS g
            FROM read_parquet('{theme('buildings', 'building')}', hive_partitioning=1)
            WHERE {where}""",
        "rail": f"""
            SELECT id, class, to_json(rail_flags) AS rail_flags, to_json(level_rules) AS level_rules,
                   names.primary AS name, ST_AsGeoJSON(geometry) AS g
            FROM read_parquet('{theme('transportation', 'segment')}', hive_partitioning=1)
            WHERE subtype = 'rail' AND {where}""",
        "roads": f"""
            SELECT id, class, to_json(road_flags) AS road_flags, to_json(level_rules) AS level_rules,
                   names.primary AS name, ST_AsGeoJSON(geometry) AS g
            FROM read_parquet('{theme('transportation', 'segment')}', hive_partitioning=1)
            WHERE subtype = 'road' AND {where}""",
    }
    for name, sql in queries.items():
        cur = con.execute(sql)
        cols = [d[0] for d in cur.description]
        feats = []
        for row in cur.fetchall():
            rec = dict(zip(cols, row))
            geom = json.loads(rec.pop("g"))
            for k in ("rail_flags", "level_rules", "road_flags"):
                if k in rec and isinstance(rec[k], str):
                    rec[k] = json.loads(rec[k])
            feats.append({"type": "Feature", "geometry": geom, "properties": rec})
        path = OUT / f"overture_downtown_{name}.geojson"
        path.write_text(json.dumps({"type": "FeatureCollection", "release": RELEASE, "features": feats}))
        print(f"  {name:<10} {len(feats):>6} features -> {path.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
