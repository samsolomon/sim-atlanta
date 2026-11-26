"""Consistency of the committed gate evidence for the D repair (Capitol Gateway lid).

This test reads committed JSON only. It does not build the City, so it cannot
detect a code regression: reverting lids.ts or the lid ground nodes would still
pass it. The code is held by web/src/terrain/lids.test.ts (the 35 lid roads
draw on the board, no lid deck survives southConnectorTransport, downtown runs
cut at the outline, and the drawn south-band ground sits at the lid top at the
patched nodes). Rerun the browser gate (check.py --expect repaired) when those
change.

What this test holds: the committed D result from the lid-aware checker
(samsolomon/crossing-check-lid e2b253ee) leaves every site but Capitol equal to
the 439abf84 reference, Capitol has no failures, and the lid was positively
found (walk samples on the board matched the cover's class-2 level, with no
deck above it)."""
import json
import unittest
from pathlib import Path

GATE = Path(__file__).resolve().parents[2] / "docs/log/ui/connector-repairs/d-lid/gate"


class GateSites(unittest.TestCase):
    def setUp(self):
        self.reference = json.loads((GATE / "ref-439abf84-combined.json").read_text())
        self.repaired = json.loads((GATE / "d-repaired.json").read_text())

    def test_only_capitol_changes(self):
        self.assertEqual(set(self.reference), set(self.repaired))
        others = [k for k in self.reference if not k.startswith("capitol-")]
        self.assertEqual(len(others), 4)
        for key in others:
            self.assertEqual(self.reference[key], self.repaired[key], key)

    def test_capitol_now_passes(self):
        for tier in ("low", "high"):
            was, now = self.reference[f"capitol-{tier}"], self.repaired[f"capitol-{tier}"]
            self.assertEqual(was["failures"], ["walk support", "joint grade"])
            self.assertEqual(now["failures"], [])
            self.assertEqual(now["missingWalkSamples"], 0)
            self.assertIsNone(now["firstUnsupported"])
            self.assertFalse(any(j["outside"] for j in now["joints"]))
            lid = now["lid"]
            self.assertTrue(lid["ok"])
            self.assertGreaterEqual(lid["matchedShare"], 0.95)
            self.assertEqual(lid["decksAboveSamples"], 0)
            self.assertEqual(lid["joints"], 6)


if __name__ == "__main__":
    unittest.main()
