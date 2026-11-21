"""Regression checks for the terrain wire format and the consumer sampling rules."""
import hashlib
import json
import unittest
from pathlib import Path

import numpy as np

from downtown_terrain import NODATA, ROOT, STEP, X0, Z0, interpolate, pack


class GroundTest(unittest.TestCase):
    def test_voids_and_edge_nodes(self):
        grid = pack(np.array([[300.1, 302.2], [303.3, np.nan]]))
        self.assertEqual(grid.dtype.str, "<i2")
        self.assertEqual(grid.tolist(), [[3001, 3022], [3033, NODATA]])
        self.assertIsNone(interpolate(grid, X0 + 1, Z0 + 1))
        self.assertIsNone(interpolate(grid, X0 - 1, Z0))
        self.assertAlmostEqual(interpolate(grid, X0 + STEP / 2, Z0), 301.15)
        self.assertAlmostEqual(interpolate(grid, X0, Z0 + STEP), 303.3)

    def test_checked_in_grid(self):
        folder = Path(ROOT) / "pipeline/prototypes/downtown-ground"
        m = json.loads((folder / "ground.json").read_text())
        data = (folder / m["file"]).read_bytes()
        self.assertEqual(hashlib.sha256(data).hexdigest(), m["sha256"])
        grid = np.frombuffer(data, dtype="<i2").reshape(m["rows"], m["cols"])
        self.assertEqual(np.count_nonzero(grid == m["noData"]), m["noDataCount"])
        self.assertAlmostEqual(interpolate(grid, 0, 0), m["vertical"]["sceneZeroNavd88M"])
        # Independent native-pixel reads on opposite sides of the Connector bank.
        # These catch a transposed or north/south-reversed grid with a valid checksum.
        self.assertAlmostEqual(interpolate(grid, 740, 555), 303.9)
        self.assertAlmostEqual(interpolate(grid, 820, 555), 314.1)
        b = m["bounds"]
        self.assertEqual(b["minX"] + (m["cols"] - 1) * m["stepM"], b["maxX"])
        self.assertEqual(b["minZ"] + (m["rows"] - 1) * m["stepM"], b["maxZ"])
        self.assertAlmostEqual(interpolate(grid, b["maxX"], b["maxZ"]), grid[-1, -1] * m["scaleM"])


if __name__ == "__main__":
    unittest.main()
