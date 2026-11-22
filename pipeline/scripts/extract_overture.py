"""Extract downtown Atlanta buildings, rail and roads from Overture Maps into GeoJSON.

One-time setup:  python3 -m venv .venv && .venv/bin/pip install duckdb
Run:             .venv/bin/python pipeline/scripts/extract_overture.py

Reads the public Overture S3 bucket directly (no account). Writes
data/raw/overture_downtown_{buildings,rail,roads,landuse,infra}.geojson for `railprep scene`
and the vignette scripts. Pass names to extract only some, e.g. `landuse infra`.
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
            SELECT id, height, num_floors, class, names.primary AS name, sources[1].dataset AS src, ST_AsGeoJSON(geometry) AS g
            FROM read_parquet('{theme('buildings', 'building')}', hive_partitioning=1)
            WHERE {where}""",
        "rail": f"""
            SELECT id, class, to_json(rail_flags) AS rail_flags, to_json(level_rules) AS level_rules,
                   names.primary AS name, ST_AsGeoJSON(geometry) AS g
            FROM read_parquet('{theme('transportation', 'segment')}', hive_partitioning=1)
            WHERE subtype = 'rail' AND {where}""",
        "roads": f"""
            SELECT id, class, subclass, to_json(road_flags) AS road_flags, to_json(level_rules) AS level_rules,
                   to_json(access_restrictions) AS access_restrictions,
                   names.primary AS name, ST_AsGeoJSON(geometry) AS g
            FROM read_parquet('{theme('transportation', 'segment')}', hive_partitioning=1)
            WHERE subtype = 'road' AND {where}""",
        # Ground: parking lots, plazas, lawns, parks, pitches, construction...
        "landuse": f"""
            SELECT id, subtype, class, names.primary AS name, ST_AsGeoJSON(geometry) AS g
            FROM read_parquet('{theme('base', 'land_use')}', hive_partitioning=1)
            WHERE {where}""",
        # Street furniture and parking: signals and stop signs (for traffic), lamps, platforms...
        "infra": f"""
            SELECT id, subtype, class, names.primary AS name, ST_AsGeoJSON(geometry) AS g
            FROM read_parquet('{theme('base', 'infrastructure')}', hive_partitioning=1)
            WHERE {where} AND class IN ('parking', 'traffic_signals', 'stop', 'crossing', 'street_lamp',
              'platform', 'fence', 'retaining_wall', 'bench', 'fountain', 'power_tower', 'bridge', 'artwork')
            UNION ALL
            SELECT id, subtype, class, names.primary AS name, ST_AsGeoJSON(geometry) AS g
            FROM read_parquet('{theme('base', 'land')}', hive_partitioning=1)
            WHERE {where} AND class IN ('tree', 'wood', 'scrub')""",
    }
    only = set(sys.argv[1:])
    if only:
        queries = {k: v for k, v in queries.items() if k in only}
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
