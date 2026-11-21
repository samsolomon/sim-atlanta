import unittest

from terrain_transport import bake
from vignette import project


class SurfaceWaysTest(unittest.TestCase):
    def test_split_on_full_geometry_before_clipping_to_both_edges(self):
        points = [[-84.3946, 33.7539], [-84.3906, 33.7539]]
        flags = [{"values": ["is_bridge"], "between": [.55, .85]}]
        road = {"properties": {"class": "secondary", "road_flags": flags},
                "geometry": {"type": "LineString", "coordinates": points}}
        bounds = {"minX": -100, "maxX": 60, "minZ": -10, "maxZ": 10}
        pieces = bake([road], [], bounds)["roads"]
        self.assertEqual([r["kind"] for r in pieces], ["ground", "bridge", "ground"])
        self.assertEqual(pieces[0]["pts"][0], [-100, 0])
        self.assertEqual(pieces[-1]["pts"][-1], [60, 0])
        for i, f in enumerate((.55, .85)):
            x = project(points[0][0] + f * .004, points[0][1])[0]
            self.assertEqual(pieces[i]["pts"][-1], [x, 0])
            self.assertEqual(pieces[i + 1]["pts"][0], [x, 0])

    def test_hidden_rail_is_scoped_and_subway_is_owned_elsewhere(self):
        line = {"type": "LineString", "coordinates": [[-84.3926, 33.7539], [-84.3906, 33.7539]]}
        flags = [{"values": ["is_tunnel"], "between": [.4, .6]}]
        rail = [{"properties": {"class": cls, "rail_flags": flags}, "geometry": line}
                for cls in ("standard_gauge", "subway")]
        t = bake([], rail, {"minX": -100, "maxX": 100, "minZ": -10, "maxZ": 10})
        self.assertEqual([r["cls"] for r in t["rail"]], ["standard_gauge"] * 2)
        self.assertLess(t["rail"][0]["pts"][-1][0], 0)
        self.assertGreater(t["rail"][1]["pts"][0][0], 0)


if __name__ == "__main__":
    unittest.main()
