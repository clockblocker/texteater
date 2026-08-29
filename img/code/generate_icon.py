#!/usr/bin/env python3
"""Generate the textfresser icon SVGs (static + animated) for an attempt.

Reads the six bite circles from optimal_circles.json (produced by
optimize_circles.py, 640x640 canvas coordinates, all sharing one radius)
and lays them over the attempt-1 page layout, which matches the mascot's
own word/eye placement.

The six bites are applied in rainbow order, red -> orange -> yellow ->
green -> blue -> violet, following the spatial layout in
img/animation-sketch.png:

  red    = upper-left     takes the page's top-left corner
  orange = above-head     carves the head's shallow dome
  yellow = upper-right    closes the page's top-right corner
  green  = lower-left     carves the body's outer-left sweep
  blue   = left-of-head   carves the head's left slope
  violet = right-of-head  carves the head and body's right side

Before writing anything the script asserts the storytelling invariants:
  - all six bites share one radius (same-size mouthfuls),
  - the eye survives on white,
  - every uneaten (black) word sits fully on white,
  - every eaten word is fully covered by at least one bite,
  - each bite eats fresh white when it lands,
  - each bite also owns visible final area (no redundant bites),
  - the surviving white silhouette is one clean connected shape, with no
    detached corner slivers or specks.

Usage:
    python3 generate_icon.py [output-dir]   (default: ../attempt-7)
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

BITE_SEQUENCE = (
    ('red', 'upper-left'),
    ('orange', 'above-head'),
    ('yellow', 'upper-right'),
    ('green', 'lower-left'),
    ('blue', 'left-of-head'),
    ('violet', 'right-of-head'),
)
RAINBOW = [color for color, _role in BITE_SEQUENCE]
ROLE_ORDER = [role for _color, role in BITE_SEQUENCE]

RASTER_SCALE = 2
MIN_FRESH_AREA = 500
MIN_UNIQUE_AREA = 500

# attempt-1's approved bite timing
BEGIN0, STAGGER, DUR = 0.40, 0.55, 0.45


def load_bites():
    doc = json.loads(CIRCLES_JSON.read_text())
    circles = doc['circles_by_role']
    assert set(circles) == set(ROLE_ORDER), (
        f"bite roles must be exactly {ROLE_ORDER}, found {list(circles)}"
    )
    radii = {c[2] for c in circles.values()}
    assert len(radii) == 1, f"bites must share one radius, found {sorted(radii)}"
    return [(role, *circles[role]) for role in ROLE_ORDER]


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

    masks = rasterize_bites(bites, RASTER_SCALE)
    pixel_count = len(masks[0])
    cover_count = bytearray(pixel_count)
    for mask in masks:
        for i, value in enumerate(mask):
            cover_count[i] += value

    seen = bytearray(pixel_count)
    for i, (role, *_rest) in enumerate(bites):
        fresh = unique = 0
        for j, value in enumerate(masks[i]):
            if not value:
                continue
            if not seen[j]:
                fresh += 1
            if cover_count[j] == 1:
                unique += 1
            seen[j] = 1
        scale_area = RASTER_SCALE * RASTER_SCALE
        assert fresh >= MIN_FRESH_AREA * scale_area, (
            f"bite {i + 1} ({role}) adds only {fresh / scale_area:.0f}px of fresh page"
        )
        assert unique >= MIN_UNIQUE_AREA * scale_area, (
            f"bite {i + 1} ({role}) owns only {unique / scale_area:.0f}px in the final shape"
        )

    assert_clean_silhouette(cover_count, RASTER_SCALE)


def rasterize_bites(bites, scale):
    """Rasterize circle interiors efficiently as horizontal spans."""
    width = int(SIZE * scale)
    masks = []
    for _role, cx, cy, radius in bites:
        mask = bytearray(width * width)
        y0 = max(0, math.ceil((cy - radius) * scale - 0.5))
        y1 = min(width - 1, math.floor((cy + radius) * scale - 0.5))
        for py in range(y0, y1 + 1):
            y = (py + 0.5) / scale
            half_width = math.sqrt(max(0.0, radius * radius - (y - cy) ** 2))
            x0 = max(0, math.ceil((cx - half_width) * scale - 0.5))
            x1 = min(width - 1, math.floor((cx + half_width) * scale - 0.5))
            if x1 >= x0:
                start = py * width + x0
                mask[start:start + x1 - x0 + 1] = b'\x01' * (x1 - x0 + 1)
        masks.append(mask)
    return masks


def assert_clean_silhouette(cover_count, scale):
    """Require exactly one white component and a fully eaten top edge."""
    width = int(SIZE * scale)
    top_leaks = sum(1 for value in cover_count[:width] if not value)
    assert top_leaks == 0, f"silhouette leaves {top_leaks} white samples on the top edge"

    white_count = sum(1 for value in cover_count if not value)
    try:
        start = cover_count.index(0)
    except ValueError as exc:
        raise AssertionError("bites consumed the entire page") from exc

    visited = bytearray(len(cover_count))
    visited[start] = 1
    stack = [start]
    connected = 0
    while stack:
        index = stack.pop()
        connected += 1
        x = index % width
        for neighbour in (index - width, index + width):
            if 0 <= neighbour < len(cover_count) and not cover_count[neighbour] and not visited[neighbour]:
                visited[neighbour] = 1
                stack.append(neighbour)
        if x and not cover_count[index - 1] and not visited[index - 1]:
            visited[index - 1] = 1
            stack.append(index - 1)
        if x + 1 < width and not cover_count[index + 1] and not visited[index + 1]:
            visited[index + 1] = 1
            stack.append(index + 1)

    assert connected == white_count, (
        f"silhouette has {white_count - connected} detached white samples; "
        "circle seams must overlap cleanly"
    )


def words_xml():
    return '\n'.join(
        f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{INK}"/>'
        for x, y, w, h, _ in WORDS)


def blue_xml():
    return '\n'.join(
        f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{BLUE[b]}"/>'
        for x, y, w, h, b in WORDS if b)


DESC = ("Construction: a white page holds black rounded word bars and a small black eye. Six equal black "
        "circles bite the page away around the textfresser, leaving one clean white silhouette aligned with "
        "the reference mascot. Every circle contributes visible final area. The bites land in rainbow order "
        "(red, orange, yellow, green, blue, violet): red takes the upper left, orange carves the head dome, "
        "yellow closes the upper right, green takes the lower left, blue carves the head's left side, and "
        "violet carves its right side. Where a "
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
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else CODE_DIR.parent / "attempt-7"
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
