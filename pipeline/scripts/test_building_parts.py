"""Unit tests for building:part extraction in `king_memorial_context`.

    .venv/bin/python -m unittest discover -s pipeline/scripts -p 'test_building_parts.py'
"""
import json
import unittest

from king_memorial_context import extract_context, part_height

# A 1 km square around the projection origin, so test coordinates stay local.
BOUNDS = {"minX": -500, "maxX": 500, "minZ": -500, "maxZ": 500}
M_PER_DEG_LAT = 111194.9


def osm(*ways):
    """An Overpass-style document of closed square ways: (id, tags, x0, z0, x1, z1) in metres."""
    import math
    elements, node = [], 1
    for ident, tags, x0, z0, x1, z1 in ways:
        refs = []
        for x, z in [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]:
            lat = 33.7539 - z / M_PER_DEG_LAT
            lon = -84.3916 + x / (M_PER_DEG_LAT * math.cos(math.radians(33.7539)))
            elements.append({"type": "node", "id": node, "lat": lat, "lon": lon})
            refs.append(node)
            node += 1
        elements.append({"type": "way", "id": ident, "nodes": refs + refs[:1], "tags": tags})
    return json.dumps({"elements": elements}).encode()


def buildings(*ways):
    return {b["id"]: b for b in extract_context(osm(*ways), BOUNDS)[0]}


class PartHeightTest(unittest.TestCase):
    def test_height_tag_is_reported(self):
        self.assertEqual(part_height({"building:part": "yes", "height": "40"}, {}), (40.0, 0.0, "reported"))

    def test_levels_scale_to_the_parent_height_unless_a_part_reports_it(self):
        parent = {"height": "100", "building:levels": "5"}
        top, _, tier = part_height({"building:part": "yes", "building:levels": "25"}, parent, tallest=25)
        self.assertAlmostEqual(top, 100)
        self.assertEqual(tier, "inferred")
        top, _, _ = part_height({"building:part": "yes", "building:levels": "25"}, parent, tallest=25, height_taken=True)
        self.assertAlmostEqual(top, 25 * 3.3)

    def test_implausible_parent_ratio_falls_back_to_3_3_m(self):
        top, _, _ = part_height({"building:part": "yes", "building:levels": "10"}, {"height": "100"}, tallest=10)
        self.assertAlmostEqual(top, 33)

    def test_no_data_is_illustrative(self):
        self.assertEqual(part_height({"building:part": "yes"}, {})[2], "illustrative")


class AttachPartsTest(unittest.TestCase):
    def test_podium_never_reports_the_whole_building_height(self):
        # Parts map 40% of a 100 m parent: the remainder is capped at the tallest part.
        b = buildings((1, {"building": "hotel", "height": "100", "building:levels": "30"}, 0, 0, 50, 50),
                      (2, {"building:part": "yes", "height": "60"}, 0, 0, 20, 50))["osm:way:1"]
        podium = [p for p in b["parts"] if p["id"] == "podium"]
        self.assertTrue(podium)
        self.assertTrue(all(p["h"] == 60 and p["tier"] == "inferred" for p in podium))

    def test_sparse_parts_leave_the_parent_height(self):
        # A small entrance part (4% of the plan) is a detail on the 86 m parent.
        b = buildings((1, {"building": "apartments", "building:levels": "24"}, 0, 0, 50, 50),
                      (2, {"building:part": "yes", "building:levels": "1"}, 0, 0, 10, 10))["osm:way:1"]
        self.assertAlmostEqual(max(p["h"] for p in b["parts"]), 86.4)

    def test_raised_part_leaves_its_underside_open(self):
        b = buildings((1, {"building": "yes", "building:levels": "7"}, 0, 0, 50, 50),
                      (2, {"building:part": "yes", "height": "25", "min_height": "4"}, 0, 0, 50, 20),
                      (3, {"building:part": "yes", "height": "25"}, 0, 20, 50, 50))["osm:way:1"]
        self.assertFalse([p for p in b["parts"] if p["id"] == "podium"])
        raised = next(p for p in b["parts"] if p["id"] == "osm:way:2")
        self.assertEqual(raised["minH"], 4)

    def test_orphans_keep_their_own_ids_names_and_tiers(self):
        found = buildings((5, {"building:part": "yes", "height": "10", "name": "A"}, 100, 100, 120, 120),
                          (6, {"building:part": "commercial", "height": "10"}, 200, 200, 220, 220),
                          (7, {"building:part": "yes"}, 300, 300, 320, 320))
        self.assertEqual(found["osm:way:5"]["name"], "A")
        self.assertEqual(found["osm:way:6"]["cls"], "commercial")
        self.assertEqual(found["osm:way:7"]["parts"][0]["tier"], "illustrative")
        self.assertEqual(found["osm:way:5"]["parts"][0]["tier"], "reported")

    def test_a_taller_part_trims_a_contained_one(self):
        b = buildings((1, {"building": "yes", "building:levels": "10"}, 0, 0, 40, 40),
                      (2, {"building:part": "yes", "height": "80"}, 0, 0, 20, 40),
                      (3, {"building:part": "yes", "height": "20"}, 0, 0, 40, 40))["osm:way:1"]
        low = [p for p in b["parts"] if p["id"] == "osm:way:3"]
        xs = [x for p in low for x, _ in p["rings"][0]]
        self.assertGreaterEqual(min(xs), 19.9)


if __name__ == "__main__":
    unittest.main()
