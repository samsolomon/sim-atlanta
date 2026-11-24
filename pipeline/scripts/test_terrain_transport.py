import unittest

from terrain_transport import FREIGHT_MAIN, bake
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

    def test_freight_distance_keeps_covered_gaps_and_ignores_parallel_tracks(self):
        tracks = []
        for i, (source_id, reverse) in enumerate(FREIGHT_MAIN):
            points = [[-84.3916 + .001*j, 33.7539] for j in (i, i + 1)]
            flags = [{"values": ["is_tunnel"], "between": [.25, .75]}] if i == 1 else []
            tracks.append({"properties": {"id": source_id, "class": "standard_gauge", "rail_flags": flags},
                           "geometry": {"type": "LineString", "coordinates": points[::-1] if reverse else points}})
        tracks.append({**tracks[0], "properties": {"class": "standard_gauge", "id": "other-main"}})
        bounds = {"minX": -10, "maxX": 400, "minZ": -10, "maxZ": 10}
        runs = bake([], tracks, bounds)["rail"]
        self.assertEqual(runs[0]["freightS"][0], 0)
        self.assertGreater(runs[2]["freightS"][0] - runs[1]["freightS"][1], 40)
        self.assertGreater(runs[3]["freightS"][0], runs[3]["freightS"][1])
        self.assertNotIn("freightS", runs[-1])
        incomplete = bake([], tracks[1:], bounds)
        self.assertFalse(any("freightS" in run for run in incomplete["rail"]))


if __name__ == "__main__":
    unittest.main()


class FreightSmoothingTest(unittest.TestCase):
    @staticmethod
    def radius_at(pts, i):
        import math
        a, b, c = pts[i - 1], pts[i], pts[i + 1]
        ab, bc, ca = math.dist(a, b), math.dist(b, c), math.dist(c, a)
        area2 = abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
        return math.inf if area2 < 1e-9 else ab * bc * ca / (2 * area2)

    def test_fillets_reach_the_minimum_radius_and_keep_ends_and_pins(self):
        from terrain_transport import MIN_RADIUS_M, smooth_centreline
        # A dog-leg with long legs, a pinned switch vertex, and a sub-centimetre stub at the end.
        pts = [[0, 0], [200, 0], [400, 40], [600, 40], [800, 120], [800.004, 120.004]]
        pinned = {(0, 0), (600, 40)}
        out, report = smooth_centreline(pts, pinned, max_shift=2.0)
        self.assertEqual(out[0], [0, 0])
        self.assertEqual(out[-1], [800.004, 120.004])
        self.assertIn([600, 40], out)  # the switch stays put
        self.assertNotIn([800, 120], out)  # the micro-segment's inner vertex is dropped
        self.assertEqual(report["short"], [])
        self.assertGreaterEqual(report["min_radius"], MIN_RADIUS_M - 1e-6)
        pinned_at = {tuple(p) for p in ([600, 40],)}
        for i in range(1, len(out) - 1):
            if tuple(out[i]) in pinned_at or tuple(out[i - 1]) in pinned_at or tuple(out[i + 1]) in pinned_at:
                continue
            self.assertGreaterEqual(self.radius_at(out, i), MIN_RADIUS_M * 0.98)

    def test_short_legs_take_the_largest_radius_that_fits_and_shift_is_capped(self):
        from terrain_transport import smooth_centreline
        out, report = smooth_centreline([[0, 0], [10, 0], [20, 3]], {(0, 0), (20, 3)}, max_shift=2.0)
        self.assertEqual(len(report["short"]), 1)
        self.assertLess(report["short"][0]["radius"], 150)
        self.assertLessEqual(report["max_shift"], 2.0)
        _, bridge = smooth_centreline([[0, 0], [400, 0], [800, 200]], {(0, 0), (800, 200)}, max_shift=0.5)
        self.assertLessEqual(bridge["max_shift"], 0.5 + 1e-9)

    def test_junctions_stay_closed_and_chainage_ends_hold(self):
        from terrain_transport import smooth_freight
        main = {"cls": "standard_gauge", "kind": "ground", "freightS": [0.0, 900.0],
                "pts": [[0, 0], [300, 0], [600, 60], [900, 60]]}
        branch = {"cls": "standard_gauge", "kind": "ground", "pts": [[300, 0], [300, 200]]}
        before = [p[:] for p in main["pts"]]
        list(smooth_freight([main, branch]))
        self.assertIn([300, 0], main["pts"])  # the branch still meets the main
        self.assertEqual(main["pts"][0], before[0])
        self.assertEqual(main["pts"][-1], before[-1])
        self.assertEqual(main["freightS"], [0.0, 900.0])
        self.assertNotIn([600, 60], main["pts"])  # the free corner is filleted

    def test_an_end_fillet_does_not_repeat_the_board_edge_point(self):
        from terrain_transport import smooth_centreline
        import math
        pts = [[1000.0, 556.47], [999.7, 556.5], [800, 560], [600, 600]]
        out, _ = smooth_centreline(pts, {(1000.0, 556.47), (600, 600)}, max_shift=2.0)
        self.assertEqual(out[0], [1000.0, 556.47])
        self.assertEqual(sum(1 for p in out if p[0] == 1000.0), 1)
        self.assertTrue(all(math.dist(a, b) > 1e-6 for a, b in zip(out, out[1:])))

