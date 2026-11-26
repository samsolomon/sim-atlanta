"""The D repair (Capitol Gateway lid) re-baselines only the Capitol site of the
439abf84 crossing gate. Every other site must stay byte-identical, and Capitol
must pass. Reads the committed gate results under docs/log/ui/connector-repairs/
d-lid/gate/: the 439abf84 reference and the D result from the lid-aware checker
(samsolomon/crossing-check-lid 846cb5b8, --expect repaired)."""
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


if __name__ == "__main__":
    unittest.main()
