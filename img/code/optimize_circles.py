#!/usr/bin/env python3
"""Derive the six bite circles from the mascot PNG.

The icon is constructed as: white page minus six black circles. The mascot's
contour is hand-drawn (not circle-exact), so we fit six circles whose union
best matches the mascot's filled silhouette (symmetric-difference loss,
multi-start Nelder-Mead at 1/4 resolution, polish at 1/2 resolution).

The result is written to optimal_circles.json in image pixel coordinates of
the mascot, together with each circle's spatial role. Roles are assigned from
the known solution layout and asserted, so a re-run that drifts to a
different arrangement fails loudly instead of mislabeling the rainbow order.

Usage:
    python3 optimize_circles.py [path-to-mascot.png]

Requires: pillow, numpy, scipy  (pip install pillow numpy scipy)
"""

import json
import sys
from pathlib import Path

import numpy as np
from scipy import ndimage, optimize

IMG_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MASCOT = IMG_DIR / "textfresser-mascot.png"
OUT_JSON = Path(__file__).resolve().parent / "optimal_circles.json"

# Known-good solution in mascot pixel coordinates (1416 x 1408), used as the
# optimization seed and for role labeling. Regenerating from scratch is
# possible but slower; see --from-scratch below.
SEED = {
    "bottom-left":   (-83.0, 663.8, 555.9),
    "left-mid":     (-270.1, 523.7, 643.6),
    "top-left":      (116.8, 190.6, 701.0),
    "center-left":   (418.9, 517.8, 396.5),
    "top":           (969.6, -344.8, 828.2),
    "right":        (1715.0,  383.7, 645.2),
}


def filled_silhouette(mascot_path):
    im = ndimage  # noqa: F841  (keep import local to module for clarity)
    from PIL import Image

    a = np.asarray(Image.open(mascot_path).convert("RGB")).astype(float)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    lum = (r + g + b) / 3
    neutral = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b) < 16
    white = neutral & (lum > 128)
    # words and the eye punch holes into the white page; the silhouette is the
    # filled region
    return ndimage.binary_fill_holes(white)


def grid(mask, factor):
    h, w = mask.shape
    hs, ws = h // factor, w // factor
    t = mask[: hs * factor, : ws * factor].reshape(hs, factor, ws, factor).mean(axis=(1, 3)) > 0.5
    yg, xg = np.mgrid[0:hs, 0:ws]
    return t, xg.astype(np.float32) * factor + factor / 2, yg.astype(np.float32) * factor + factor / 2


def make_loss(target, xg, yg):
    hs, ws = target.shape

    def loss(p):
        covered = np.zeros((hs, ws), dtype=bool)
        for i in range(6):
            cx, cy, rad = p[3 * i : 3 * i + 3]
            if rad <= 0:
                return 1e12
            covered |= (xg - cx) ** 2 + (yg - cy) ** 2 <= rad * rad
        return float((~covered ^ target).sum())

    return loss


def run_optimization(mask, seed_vec, seed=7, restarts=6):
    t4, x4, y4 = grid(mask, 4)
    t2, x2, y2 = grid(mask, 2)
    loss4, loss2 = make_loss(t4, x4, y4), make_loss(t2, x2, y2)
    rng = np.random.default_rng(seed)
    full = dict(maxiter=80000, maxfev=80000, xatol=1.2, fatol=25.0, adaptive=True)
    quick = dict(maxiter=30000, maxfev=30000, xatol=1.2, fatol=25.0, adaptive=True)

    p = optimize.minimize(loss4, seed_vec, method="Nelder-Mead", options=full).x
    for _ in range(restarts):
        cand = optimize.minimize(loss4, p + rng.normal(0, [25, 25, 18] * 6), method="Nelder-Mead", options=quick)
        if cand.fun < loss4(p):
            p = cand.x

    p = optimize.minimize(loss2, p, method="Nelder-Mead",
                          options=dict(maxiter=60000, maxfev=60000, xatol=0.35, fatol=8.0, adaptive=True)).x
    for _ in range(restarts):
        cand = optimize.minimize(loss2, p + rng.normal(0, [6, 6, 5] * 6), method="Nelder-Mead",
                                 options=dict(maxiter=30000, maxfev=30000, xatol=0.35, fatol=8.0, adaptive=True))
        if cand.fun < loss2(p):
            p = cand.x

    covered = np.zeros(t2.shape, dtype=bool)
    for i in range(6):
        cx, cy, rad = p[3 * i : 3 * i + 3]
        covered |= (x2 - cx) ** 2 + (y2 - cy) ** 2 <= rad * rad
    model = ~covered
    iou = (model & t2).sum() / (model | t2).sum()
    return p, float(loss2(p)), float(iou)


def assign_roles(circles):
    """Match optimized circles to spatial roles by center proximity to the seed."""
    roles = list(SEED)
    out = {}
    used = set()
    for role in roles:
        sx, sy, _ = SEED[role]
        best, bestd = None, 1e18
        for i, (cx, cy, rad) in enumerate(circles):
            if i in used:
                continue
            d = (cx - sx) ** 2 + (cy - sy) ** 2
            if d < bestd:
                best, bestd = i, d
        used.add(best)
        out[role] = circles[best]
        if bestd > 250**2:
            raise SystemExit(f"circle drifted from seed role {role!r} by {bestd**0.5:.0f}px; "
                             "review the rainbow-order assignment before generating the SVG")
    assert len(used) == 6
    return out


def main():
    mascot = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_MASCOT
    mask = filled_silhouette(mascot)
    h, w = mask.shape
    seed_vec = np.array([SEED[r] for r in ("bottom-left", "left-mid", "top-left", "center-left", "top", "right")]).ravel()
    p, loss, iou = run_optimization(mask, seed_vec)
    circles = [tuple(p[3 * i : 3 * i + 3]) for i in range(6)]
    roles = assign_roles(circles)
    doc = {
        "source": str(mascot),
        "image_size": [w, h],
        "ioU_vs_mascot": round(iou, 4),
        "loss_halfres": int(loss),
        "circles_by_role": {r: [round(v, 2) for v in c] for r, c in roles.items()},
    }
    OUT_JSON.write_text(json.dumps(doc, indent=2) + "\n")
    print(json.dumps(doc, indent=2))
    print(f"\nwrote {OUT_JSON}")


if __name__ == "__main__":
    main()
