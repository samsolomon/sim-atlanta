import unittest
from carrier_order import classify, deck_evidence, relation


class ClassificationTest(unittest.TestCase):
    def test_pinned_controls(self):
        records = {tuple(r["ways"]): r for r in classify()}
        ramp = records[(9235148,)]
        self.assertEqual(ramp["registerClass"]["value"], "ground")
        self.assertEqual(ramp["carrier"]["value"], "deck-supported")
        self.assertAlmostEqual(ramp["treadNavd88M"]["value"], 304.28, places=2)
        self.assertIsNone(ramp["order"]["value"])
        self.assertEqual(
            records[(115789929, 38970413)]["order"]["value"], [38970413, 115789929]
        )
        for way in (1450813223, 1450813225):
            self.assertEqual(
                records[(way, 39449296)]["order"]["value"], [way, 39449296]
            )
        grants = [r for ids, r in records.items() if ids[-1] == 144588627]
        self.assertEqual(len(grants), 8)
        self.assertTrue(all(r["treadNavd88M"]["value"] is None for r in grants))
        self.assertTrue(
            all(r["physicalClearanceM"]["value"] is None for r in records.values())
        )

    def test_conflicting_endpoints_and_missing_samples(self):
        points = [[0, 0], [3, 0]]
        data = [
            dict(
                start=points[0],
                end=points[1],
                spans=[[[0, 100], [1, 101]], [[2, 80], [3, 81]]],
            )
        ]
        for station in (-1, 1.5, 4):
            self.assertIsNone(deck_evidence(points, data, station)["value"])
        self.assertIsNone(deck_evidence(points, data * 2, 1)["value"])
        self.assertIsNone(deck_evidence([points[0], [4, 0]], data, 1)["value"])

    def test_connection_elsewhere_does_not_set_order(self):
        a = dict(id=1, nodes=[1, 2], pts=[(0, 0), (20, 0)], tags={})
        b = dict(id=2, nodes=[1, 3, 4], pts=[(0, 0), (10, 1), (10, -1)], tags={})
        self.assertIsNone(relation(a, b, (10, 0))["value"])
        self.assertEqual(relation(a, b, (0, 0))["value"], "connected")
