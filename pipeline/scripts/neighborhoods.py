"""City of Atlanta neighbourhood boundaries → web/public/data/ga/neighborhoods.json.

Source: City of Atlanta Department of City Planning GIS, AdministrativeArea/GeopoliticalArea
FeatureServer layer 1 ("Neighborhood"). Used only to name the place under the camera in the
status card. Stdlib only.
"""

import json
import pathlib
import urllib.parse
import urllib.request

URL = "https://gis.atlantaga.gov/dpcd/rest/services/AdministrativeArea/GeopoliticalArea/FeatureServer/1/query"
OUT = pathlib.Path(__file__).resolve().parents[2] / "web/public/data/ga/neighborhoods.json"


def main() -> None:
    q = urllib.parse.urlencode(
        {"where": "1=1", "outFields": "NAME", "returnGeometry": "true", "outSR": "4326", "geometryPrecision": "5", "f": "geojson"}
    )
    with urllib.request.urlopen(f"{URL}?{q}", timeout=60) as r:
        data = json.load(r)
    if data.get("exceededTransferLimit"):
        raise SystemExit("neighborhoods: server truncated the result; page the query")
    feats = []
    for f in data["features"]:
        g = f.get("geometry")
        name = (f.get("properties") or {}).get("NAME")
        if not g or not name:
            continue
        feats.append({"type": "Feature", "properties": {"name": name.strip()}, "geometry": g})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"type": "FeatureCollection", "source": "City of Atlanta DCP GIS", "features": feats}, separators=(",", ":")))
    print(f"neighborhoods: {len(feats)} → {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
