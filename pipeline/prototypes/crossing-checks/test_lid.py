"""The Capitol lid check on synthetic scenes: a lid it must find, and the two ways to fake one.

    python -m unittest test_lid      (from this folder, with numpy and shapely)

The board is drawn exactly at each registered way's class-2 median, with no decks and no walks,
so every walk sample falls back to the board and the lid check runs. Grok's round-2 inputs on D:
a short way 1 m high (1451206626, 10 stations) and a 19 m hole in the board on 561694953 with a
street deck 2 m above it. Both passed the earlier global thresholds.
"""
import unittest

import numpy as np
from shapely.geometry import LineString, Point

import check
from check import REGISTER, capitol


def _surface():
    """(x, z) -> class-2 median scene height of the nearest registered way at its nearest station."""
    ways = []
    for data in REGISTER.values():
        line = LineString(data['points'])
        ar = np.array(data['class2'])
        ways.append((data['way'], line, ar))

    def height(p):
        q = Point(p)
        way, line, ar = min(ways, key=lambda w: w[1].distance(q))
        s = line.project(q)
        return float(ar[np.argmin(abs(ar[:, 0] - s)), 3]) - 323.8, way, s
    return height


class Surface:
    def __init__(self, fn):
        self.fn = fn

    def hits(self, p):
        return self.fn(p)


class FakeScene:
    """Only the board and, optionally, street decks; no walk decks (a lid model)."""
    def __init__(self, board, decks=None):
        self.board, self.decks = board, decks

    def layer(self, *, name='', colors=(), board=False):
        if board:
            return Surface(self.board)
        if name == 'Decks and embedded rails' and colors == [0x5d5f66] and self.decks:
            return Surface(self.decks)
        raise ValueError('Empty mounted selection')


height = _surface()


def lid(board, decks=None):
    return capitol(FakeScene(board, decks))['lid']


class LidCheck(unittest.TestCase):
    def test_finds_a_lid_at_the_class2_level(self):
        result = lid(lambda p: [height(p)[0]])
        self.assertTrue(result['ok'], result)
        self.assertEqual(result['failedWays'], [])
        # Every registered way is held on its own, the shortest included.
        self.assertGreaterEqual(min(w['stations'] for w in result['ways'].values()), check.LID_MIN_STATIONS)

    def test_a_short_way_one_metre_high_fails(self):
        def board(p):
            y, way, _ = height(p)
            return [y + (1.0 if way == 1451206626 else 0)]
        result = lid(board)
        self.assertFalse(result['ok'])
        self.assertEqual(result['failedWays'], [1451206626])
        # The share over all ways alone would still pass: the per-way rule is what fails it.
        self.assertGreater(result['matchedShare'], check.LID_SHARE)

    def test_a_deck_over_a_hole_in_the_board_fails(self):
        line = LineString(next(d for d in REGISTER.values() if d['way'] == 561694953)['points'])
        a = line.length / 2 - 9.5
        hole = LineString([line.interpolate(s).coords[0] for s in np.linspace(a, a + 19, 40)]).buffer(2.0, cap_style='flat')

        def board(p):
            return [] if hole.contains(Point(p)) else [height(p)[0]]

        def decks(p):
            return [height(p)[0] + 2.0] if hole.contains(Point(p)) else []
        result = lid(board, decks)
        self.assertFalse(result['ok'])
        self.assertGreater(result['decksAboveSamples'], 0)
        # The hole alone stays inside the 80% coverage allowance: only the deck test catches it.
        self.assertEqual(result['failedWays'], [])


if __name__ == '__main__':
    unittest.main()
