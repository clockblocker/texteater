#!/usr/bin/env python3
"""Generate the textfresser icon SVGs (static + animated) for an attempt.

Reads the six bite circles from optimal_circles.json (produced by
optimize_circles.py, 640x640 canvas coordinates, all sharing one radius)
and lays them over the attempt-1 page layout, which matches the mascot's
own word/eye placement.

The six bites are applied in rainbow order, red -> orange -> yellow ->
green -> blue -> violet, following the animation sketch
(img/animation-sketch.png), where the colors communicate the order of
application and each colored circle was pixel-fitted to pin its position:

  red    = upper-left    the page's top-left corner
  orange = upper-right   off the right edge, the head's right side
  yellow = above-head    straight from the top, takes the dome
  green  = left-of-head  the head's left slope
  blue   = far-left      off the far left, the outer left white
  violet = left-middle   off the left edge, the left sweep that
                         completes the silhouette

Before writing anything the script asserts the storytelling invariants:
  - all six bites share one radius (same-size mouthfuls),
  - the eye survives on white,
  - every uneaten (black) word sits fully on white,
  - every eaten word is fully covered by at least one bite,
  - each bite, landing in rainbow order, eats white that no earlier bite
    has taken (no dead beats in the animation).

Usage:
    python3 generate_icon.py [output-dir]   (default: ../attempt-6)
"""

import json
import math
import sys
from pathlib import Path

CODE_DIR = Path(__file__).resolve().parent
CIRCLES_JSON = CODE_DIR / "optimal_circles.json"

# Icon canvas
SIZE = 640.0

# attempt-1 word layout (matches the mascot within ~1px), with the mascot's
# own eaten-state shading: 'L' light blue (processed), 'D' dark blue (not yet
# known), None = stays black on the surviving page.
WORDS = [
    (178,  54, 117, 31, 'L'),
    (334,  54, 121, 31, 'D'),
    ( 72, 150, 187, 31, 'D'),
    (299, 149,  57, 32, 'L'),
    (398, 150,  76, 31, 'D'),
    (521, 148,  40, 31, 'L'),
    ( 31, 246, 122, 32, 'L'),
    (192, 247, 144, 30, 'D'),
    ( 28, 331,  99, 31, 'D'),
    (159, 330, 112, 32, 'L'),
    ( 68, 442,  44, 31, 'D'),
    (194, 441, 174, 31, None),
    (405, 441, 153, 31, None),
    (152, 529,  93, 31, None),
    (285, 529, 106, 31, None),
    (432, 529,  51, 31, None),
]
EYE = (407.5, 262.0, 15.0)

PAGE_BG = "#000000"
PAGE = "#FFFFFF"
INK = "#1E1613"
BLUE = {'L': "#0D385B", 'D': "#071E2E"}

RAINBOW = ['red', 'orange', 'yellow', 'green', 'blue', 'violet']
ROLE_ORDER = ['upper-left', 'upper-right', 'above-head', 'left-of-head', 'far-left', 'left-middle']

# attempt-1's approved bite timing
BEGIN0, STAGGER, DUR = 0.40, 0.55, 0.45


def load_bites():
    doc = json.loads(CIRCLES_JSON.read_text())
    radii = {c[2] for c in doc['circles_by_role'].values()}
    assert len(radii) == 1, f"bites must share one radius, found {sorted(radii)}"
    return [(role, *doc['circles_by_role'][role]) for role in ROLE_ORDER]


def check_invariants(bites):
    covered_by = []
    for _, cx, cy, r in bites:
        covered_by.append(lambda x, y, cx=cx, cy=cy, r=r: (x - cx) ** 2 + (y - cy) ** 2 <= r * r)

    def covered(x, y, upto=None):
        cs = covered_by if upto is None else covered_by[:upto]
        return any(c(x, y) for c in cs)

    ex, ey, er = EYE
    for a in range(0, 360, 15):
        x = ex + (er + 1) * math.cos(math.radians(a))
        y = ey + (er + 1) * math.sin(math.radians(a))
        assert not covered(x, y), f"eye ring covered by a bite at angle {a}"

    for x, y, w, h, state in WORDS:
        corners = [(x + dx, y + dy) for dx in (0, w) for dy in (0, h)]
        if state is None:
            for px, py in corners:
                assert not covered(px, py), f"uneaten word at ({x},{y}) is covered by a bite"
        else:
            for px, py in corners:
                assert covered(px, py), f"eaten word at ({x},{y}) is not fully covered by the bites"

    # each bite must eat white that no earlier bite has taken
    step = 4
    for i, (_, cx, cy, r) in enumerate(bites):
        fresh = 0
        for a in range(0, 360, 2):
            for rr in (r - 2, r - 6, r - 12):
                x = cx + rr * math.cos(math.radians(a))
                y = cy + rr * math.sin(math.radians(a))
                if 0 <= x < SIZE and 0 <= y < SIZE and not covered(x, y, upto=i):
                    fresh += 1
                    break
        assert fresh > 4, f"bite {i + 1} ({bites[i][0]}) eats no fresh white; reorder the rainbow"


def words_xml():
    return '\n'.join(
        f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{INK}"/>'
        for x, y, w, h, _ in WORDS)


def blue_xml():
    return '\n'.join(
        f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{BLUE[b]}"/>'
        for x, y, w, h, b in WORDS if b)


DESC = ("Construction: a white page holds black rounded word bars and a small black eye. Six equal black "
        "circles bite the page away around the textfresser, leaving it as the white silhouette (round head "
        "with a domed top, body flaring out to the bottom-left) aligned with the reference mascot. The bites "
        "land in rainbow order (red, orange, yellow, green, blue, violet): red takes the top-left corner, "
        "orange the upper right, yellow drops straight onto the head from above, green the head's left "
        "slope, blue the far left, and violet the lower-left sweep that completes the silhouette. Where a "
        "bite covers a word, a blue rectangle is layered directly on top of its black original: the eaten "
        "words turn blue, floating on the black that replaced the page. Darker blue words are not yet "
        "known, lighter blue ones are processed.")


def static_svg(bites):
    bites_xml = '\n'.join(
        f'  <circle cx="{cx:.2f}" cy="{cy:.2f}" r="{r:.2f}" fill="{PAGE_BG}"/><!-- {col} bite, {role} -->'
        for col, (role, cx, cy, r) in zip(RAINBOW, bites))
    clip_xml = '\n'.join(
        f'    <circle cx="{cx:.2f}" cy="{cy:.2f}" r="{r:.2f}"/>'
        for role, cx, cy, r in bites)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="640" height="640">
  <title>textfresser eating a page</title>
  <desc>{DESC}</desc>
  <!-- the canvas -->
  <rect width="640" height="640" fill="{PAGE_BG}"/>
  <!-- the page -->
  <rect width="640" height="640" fill="{PAGE}"/>
  <!-- the words, uneaten -->
{words_xml()}
  <!-- the eye -->
  <circle cx="{EYE[0]}" cy="{EYE[1]}" r="{EYE[2]}" fill="{INK}"/>
  <!-- the six equal bites eat the page away, leaving the textfresser (rainbow order) -->
{bites_xml}
  <!-- eaten words: blue copies on top of their black originals, only where the bites cover them -->
  <clipPath id="bites">
{clip_xml}
  </clipPath>
  <g clip-path="url(#bites)">
{blue_xml()}
  </g>
</svg>
'''


def animated_svg(bites):
    lines, clip_lines = [], []
    for i, (role, cx, cy, r) in enumerate(bites):
        lines.append(f'  <circle cx="{cx:.2f}" cy="{cy:.2f}" r="0" fill="{PAGE_BG}">'
                     f'<!-- {RAINBOW[i]} bite ({role}) -->'
                     f'<animate attributeName="r" values="0;{r:.2f}" begin="{BEGIN0 + STAGGER * i:.2f}s" '
                     f'dur="{DUR}s" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.2 1" keyTimes="0;1"/></circle>')
        clip_lines.append(f'    <circle cx="{cx:.2f}" cy="{cy:.2f}" r="0">'
                          f'<animate attributeName="r" values="0;{r:.2f}" begin="{BEGIN0 + STAGGER * i:.2f}s" '
                          f'dur="{DUR}s" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.2 1" keyTimes="0;1"/></circle>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="640" height="640">
  <title>textfresser eating a page (animated)</title>
  <desc>{DESC} This version replays the construction: the six equal bites grow in rainbow order and the eaten words turn blue exactly where they are covered.</desc>
  <!-- the canvas -->
  <rect width="640" height="640" fill="{PAGE_BG}"/>
  <!-- the page -->
  <rect width="640" height="640" fill="{PAGE}"/>
  <!-- the words, uneaten -->
{words_xml()}
  <!-- the eye -->
  <circle cx="{EYE[0]}" cy="{EYE[1]}" r="{EYE[2]}" fill="{INK}"/>
  <!-- the bites, in rainbow order: they grow in and eat the page away -->
{chr(10).join(lines)}
  <!-- eaten words: blue copies revealed exactly where the bites cover them -->
  <clipPath id="bites">
{chr(10).join(clip_lines)}
  </clipPath>
  <g clip-path="url(#bites)">
{blue_xml()}
  </g>
</svg>
'''


def main():
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else CODE_DIR.parent / "attempt-6"
    out_dir.mkdir(parents=True, exist_ok=True)
    bites = load_bites()
    check_invariants(bites)
    (out_dir / "textfresser-eating.svg").write_text(static_svg(bites))
    (out_dir / "textfresser-eating-animated.svg").write_text(animated_svg(bites))
    print(f"wrote {out_dir / 'textfresser-eating.svg'}")
    print(f"wrote {out_dir / 'textfresser-eating-animated.svg'}")
    for col, (role, cx, cy, r) in zip(RAINBOW, bites):
        print(f"  {col:7s} {role:13s} ({cx:7.2f},{cy:7.2f}) r={r:6.2f}")


if __name__ == "__main__":
    main()
