#!/usr/bin/env python3
"""Derive the six bite circles from the mascot PNG, all with the same radius.

The icon is constructed as: white page minus six black circles. The mascot's
contour is hand-drawn (not circle-exact), so the circles are fitted to the
mascot's filled silhouette by symmetric-difference loss (Nelder-Mead,
multi-resolution). The fit lives on the square 640x640 icon canvas: the
mascot mask is resampled first, so the emitted radius is the final SVG
radius and equal by construction.

All six circles share one radius, fixed by the single-bite reference the
author attached alongside the clearer animation sketch: a blue disc of
285 px on a 1066 px page, i.e. 26.6% of the page -- 171 px on the 640
canvas (attempt-4's 231.6 was too large). Only the six centers are fitted,
bounded to their spatial roles so the rainbow application order in
generate_icon.py keeps its meaning; IoU 0.985 -- better than every
previous attempt, including the free-radius one.

SEED below is the multi-start winner (equal-radius Nelder-Mead, several
random restarts, half-res fit + full-res polish; wide re-ranks between the
quarter- and half-resolution losses made blind re-runs land in worse
basins, so the winner is kept as the deterministic seed). The script
re-verifies it against the current mascot mask, refines all six centers
multi-resolution with a contour-weighted loss (the visible edge matters
more than bulk area), and asserts every circle stays at its post -- a
drift fails loudly instead of silently mislabeling the rainbow order.

Not every circle binds the final contour: on this silhouette four arcs do
the carving (dome, right side, head slope, left sweep) and the remaining
two bites land earlier in the sequence, eating fresh white that later
bites then overlap. Between black bites the overlap is invisible, and the
animation still shows six real mouthfuls; generate_icon.py asserts the
order-aware freshness. The result is written to optimal_circles.json in
canvas coordinates, with each circle's spatial role.

Usage:
    python3 optimize_circles.py [path-to-mascot.png]

Requires: pillow, numpy, scipy  (pip install pillow numpy scipy)
"""

import json
import sys
from pathlib import Path

import numpy as np
from scipy import ndimage, optimize
from PIL import Image

IMG_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MASCOT = IMG_DIR / "textfresser-mascot.png"
OUT_JSON = Path(__file__).resolve().parent / "optimal_circles.json"

# Icon canvas
SIZE = 640.0

# The multi-start winner in canvas coordinates (see module docstring).
# Roles describe where each bite comes from; the rainbow application order
# that consumes them lives in generate_icon.py.
SEED = {
    "upper-left":   (147.39,  92.64),  # the page's top-left corner
    "upper-right":  (671.03, 248.04),  # off the right edge, the right side + top-right
    "above-head":   (469.39,  55.45),  # straight from the top, carves the head dome
    "left-of-head": (195.75, 241.31),  # carves the head's left slope
    "far-left":     (-85.00, 405.00),  # off the far left; overlapping story bite
    "left-middle":  (11.36, 369.02),   # off the left edge, carves the left sweep
}
ROLE_ORDER = ("upper-left", "upper-right", "above-head", "left-of-head", "far-left", "left-middle")
SEED_RADIUS = 171.0


def filled_silhouette(mascot_path):
    a = np.asarray(Image.open(mascot_path).convert("RGB")).astype(float)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    lum = (r + g + b) / 3
    neutral = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b) < 16
    white = neutral & (lum > 128)
    # words and the eye punch holes into the white page; the silhouette is the
    # filled region
    filled = ndimage.binary_fill_holes(white)
    # resample onto the square icon canvas (bilinear coverage, then threshold)
    cov = np.asarray(Image.fromarray(filled.astype(np.uint8) * 255)
                     .resize((int(SIZE), int(SIZE)), Image.BILINEAR))
    return cov > 127


def grid(mask, factor):
    h, w = mask.shape
    hs, ws = h // factor, w // factor
    t = mask[: hs * factor, : ws * factor].reshape(hs, factor, ws, factor).mean(axis=(1, 3)) > 0.5
    yg, xg = np.mgrid[0:hs, 0:ws]
    return t, xg.astype(np.float32) * factor + factor / 2, yg.astype(np.float32) * factor + factor / 2


def make_loss(target, xg, yg):
    """Symmetric difference between the model's white and the target mask.
    Parameter vector, blocked layout: (cx1..cx6, cy1..cy6, shared_radius)."""

    def loss(p):
        rad = p[12]
        if rad <= 10:
            return 1e12
        covered = np.zeros(target.shape, dtype=bool)
        for i in range(6):
            covered |= (xg - p[i]) ** 2 + (yg - p[6 + i]) ** 2 <= rad * rad
        return float((~covered ^ target).sum())

    return loss


def evaluate(p, mask, factor):
    t, xg, yg = grid(mask, factor)
    covered = np.zeros(t.shape, dtype=bool)
    for i in range(6):
        covered |= (xg - p[i]) ** 2 + (yg - p[6 + i]) ** 2 <= p[12] ** 2
    model = ~covered
    return float((model & t).sum() / (model | t).sum())


def edge_weights(mask, band=6.0):
    """Weights that stress the contour: pixels within `band` of the target
    silhouette boundary count 5x in the loss, so the fit nails the visible
    edge (the head dome, its mid-top peak, the left sweep) instead of only
    bulk area."""
    dist_out = ndimage.distance_transform_edt(~mask)
    dist_in = ndimage.distance_transform_edt(mask)
    band_px = np.minimum(dist_out, dist_in)
    w = np.where(band_px <= band, 5.0, 1.0).astype(np.float32)
    return w


def refine(mask, vec, factors, weight_band=6.0):
    """Multi-resolution Nelder-Mead over all six centers (radius fixed by
    the reference) on the contour-weighted, edge-leak-penalized loss.
    Accepts only improvements at each resolution."""
    p = vec.copy()
    full_w = edge_weights(mask, weight_band)

    def weights_at(factor):
        if factor == 1:
            return full_w
        h = full_w.shape[0] // factor
        wd = full_w.shape[1] // factor
        return full_w[:h * factor, :wd * factor].reshape(h, factor, wd, factor).mean(axis=(1, 3))

    def make_loss(factor):
        t, xg, yg = grid(mask, factor)
        w = weights_at(factor)

        def loss(q):
            cov = np.zeros(t.shape, dtype=bool)
            for i in range(6):
                cov |= (xg - q[i]) ** 2 + (yg - q[6 + i]) ** 2 <= p[12] ** 2
            return float(((~cov ^ t) * w).sum())

        return loss

    for factor in factors:
        loss = make_loss(factor)
        q0 = np.array([p[i] for i in range(12)])
        best_f, best_q = loss(q0), q0
        # jittered restarts per resolution escape shallow notches; sigma
        # scales down as the resolution sharpens
        rng = np.random.default_rng(7 * factor)
        sigma = {8: 25.0, 4: 15.0, 2: 8.0, 1: 4.0}[factor]
        starts = [q0] + [q0 + rng.normal(0, sigma, 12) for _ in range(6)]
        for s in starts:
            cand = optimize.minimize(loss, s, method="Nelder-Mead",
                                     options=dict(maxiter=30000, maxfev=30000,
                                                  xatol=0.15, fatol=2.0, adaptive=True))
            if cand.fun < best_f:
                best_f, best_q = cand.fun, cand.x
        if best_f < loss(q0):
            p[:12] = best_q

    # greedy per-circle scan: each bite tries small shifts on its own,
    # escaping the coupled basins Nelder-Mead refuses to leave
    t1, x1, y1 = grid(mask, 1)
    full_w = edge_weights(mask, weight_band)

    def wloss(p):
        cov = np.zeros(t1.shape, dtype=bool)
        for i in range(6):
            cov |= (x1 - p[i]) ** 2 + (y1 - p[6 + i]) ** 2 <= p[12] ** 2
        return float(((~cov ^ t1) * full_w).sum())

    # adjacent bite pairs (closing a sliver needs both circles to move),
    # swept on a half-resolution grid to keep the 4-D scan affordable
    t2, x2, y2 = grid(mask, 2)
    w2 = full_w[:640:2, :640:2] + full_w[1:640:2, :640:2] + full_w[:640:2, 1:640:2] + full_w[1:640:2, 1:640:2]

    def wloss2(p):
        cov = np.zeros(t2.shape, dtype=bool)
        for i in range(6):
            cov |= (x2 - p[i]) ** 2 + (y2 - p[6 + i]) ** 2 <= p[12] ** 2
        return float(((~cov ^ t2) * w2).sum())

    PAIRS = [(0, 2), (2, 1), (2, 3), (3, 4), (3, 5)]  # role indices in ROLE_ORDER
    for step in (2.0, 1.0):
        rng = np.arange(-6 if step == 2.0 else -2, (6.5 if step == 2.0 else 2.5), step)
        for _ in range(3):
            improved = False
            for i, j in PAIRS:
                base = wloss2(p)
                best_d, best_f = None, base
                oi0, oj0 = (p[i], p[6 + i]), (p[j], p[6 + j])
                for dxi in rng:
                    for dyi in rng:
                        for dxj in rng:
                            for dyj in rng:
                                if dxi == dyi == dxj == dyj == 0:
                                    continue
                                p[i], p[6 + i] = oi0[0] + dxi, oi0[1] + dyi
                                p[j], p[6 + j] = oj0[0] + dxj, oj0[1] + dyj
                                f = wloss2(p)
                                if f < best_f:
                                    best_d, best_f = ((dxi, dyi), (dxj, dyj)), f
                p[i], p[6 + i] = oi0
                p[j], p[6 + j] = oj0
                if best_d is not None:
                    p[i], p[6 + i] = p[i] + best_d[0][0], p[6 + i] + best_d[0][1]
                    p[j], p[6 + j] = p[j] + best_d[1][0], p[6 + j] + best_d[1][1]
                    improved = True
            if not improved:
                break

    # fine single-circle polish at full resolution
    for _ in range(3):
        improved = False
        for i in range(6):
            base = wloss(p)
            best_d, best_f = (0.0, 0.0), base
            for dx in np.arange(-6, 6.5, 1.0):
                for dy in np.arange(-6, 6.5, 1.0):
                    if dx == 0 and dy == 0:
                        continue
                    p[i], p[6 + i] = p[i] + dx, p[6 + i] + dy
                    f = wloss(p)
                    p[i], p[6 + i] = p[i] - dx, p[6 + i] - dy
                    if f < best_f:
                        best_d, best_f = (dx, dy), f
            if best_f < base:
                p[i] += best_d[0]
                p[6 + i] += best_d[1]
                improved = True
        if not improved:
            break
    return p


def assign_roles(p):
    """Match circles to spatial roles by center proximity to the seed."""
    circles = [(p[i], p[6 + i], p[12]) for i in range(6)]
    out = {}
    used = set()
    for role in ROLE_ORDER:
        sx, sy = SEED[role]
        best, bestd = None, 1e18
        for i, (cx, cy, rad) in enumerate(circles):
            if i in used:
                continue
            d = (cx - sx) ** 2 + (cy - sy) ** 2
            if d < bestd:
                best, bestd = i, d
        used.add(best)
        out[role] = circles[best]
        if bestd > 60**2:
            raise SystemExit(f"circle drifted from seed role {role!r} by {bestd**0.5:.0f}px; "
                             "review the rainbow-order assignment before generating the SVG")
    assert len(used) == 6
    return out


def main():
    mascot = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_MASCOT
    mask = filled_silhouette(mascot)
    seed_vec = np.array([SEED[r][0] for r in ROLE_ORDER] + [SEED[r][1] for r in ROLE_ORDER] + [SEED_RADIUS])

    seed_iou = evaluate(seed_vec, mask, 1)
    p = refine(mask, seed_vec, factors=(8, 4, 2, 1))
    iou1 = evaluate(p, mask, 1)
    if iou1 < seed_iou:
        # the weighted loss is a proxy; never ship a fit that fits the
        # mascot worse than the seed does
        print(f"refine degraded iou {iou1:.4f} < seed {seed_iou:.4f}; keeping seed")
        p, iou1 = seed_vec, seed_iou
    print(f"seed iou(full)={seed_iou:.4f}  polished iou(full)={iou1:.4f}  R={p[12]:.2f}")
    if iou1 < 0.97:
        raise SystemExit(f"fit degraded to {iou1:.4f}; the seed no longer matches this mascot")

    roles = assign_roles(p)
    doc = {
        "source": str(mascot),
        "canvas": "640x640, canvas coordinates",
        "shared_radius": round(p[12], 2),
        "ioU_vs_mascot": round(iou1, 4),
        "circles_by_role": {r: [round(v, 2) for v in c] for r, c in roles.items()},
    }
    OUT_JSON.write_text(json.dumps(doc, indent=2) + "\n")
    print(json.dumps(doc, indent=2))
    print(f"\nwrote {OUT_JSON}")


if __name__ == "__main__":
    main()
