#!/usr/bin/env python3
"""Fit six distinct, equal-radius bite circles to the mascot silhouette.

The animation sketch is the construction model, not merely a loose visual
reference. Its rainbow order fixes six spatial jobs:

  red    upper-left
  orange above-head
  yellow upper-right
  green  lower-left
  blue   left-of-head
  violet right-of-head

Every bite must add fresh page area when it lands and retain unique area in
the final union. The surviving page must be one connected white component;
detached white slivers and specks are invalid, even when their pixel area is
small. Within those hard constraints the optimizer minimizes contour error
against img/textfresser-mascot.png.

Usage:
    python3 optimize_circles.py [path-to-mascot.png]

Requires: pillow, numpy, scipy
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage, optimize

IMG_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MASCOT = IMG_DIR / "textfresser-mascot.png"
OUT_JSON = Path(__file__).resolve().parent / "optimal_circles.json"

SIZE = 640
ROLE_ORDER = (
    "upper-left",
    "above-head",
    "upper-right",
    "lower-left",
    "left-of-head",
    "right-of-head",
)

# A contour-polished version of the six colored positions in
# img/animation-sketch.png. Unlike attempts 5 and 6, these parameters include
# the yellow top-right bite and do not include a redundant second far-left bite.
SEED = {
    "upper-left": (130.9200, 96.0522),
    "above-head": (429.8764, 52.3311),
    "upper-right": (672.2313, 65.7132),
    "lower-left": (13.2184, 370.5257),
    "left-of-head": (197.8397, 242.7188),
    "right-of-head": (668.4694, 247.9745),
}
SEED_RADIUS = 168.6251

# The bounds keep each parameter attached to its narrative job throughout
# optimization. Roles are never recovered after the fact by nearest-neighbour
# matching, as they were in attempts 5 and 6.
ROLE_BOUNDS = {
    "upper-left": ((80.0, 180.0), (30.0, 140.0)),
    "above-head": ((380.0, 490.0), (0.0, 130.0)),
    "upper-right": ((570.0, 700.0), (0.0, 140.0)),
    "lower-left": ((-100.0, 80.0), (300.0, 460.0)),
    "left-of-head": ((140.0, 260.0), (170.0, 320.0)),
    "right-of-head": ((610.0, 740.0), (170.0, 350.0)),
}
RADIUS_BOUNDS = (166.0, 172.0)

CLEAN_SCALE = 4
MIN_FRESH_AREA = 500.0
MIN_UNIQUE_AREA = 500.0
FALSE_WHITE_WEIGHT = 1.35
DETACHED_PIXEL_PENALTY = 5000.0
BOUNDS_PENALTY = 1_000_000.0


def trim_presentation_frame(rgb):
    """Remove the thin uniform export frame without cropping icon content."""
    frame = rgb[0, 0]
    content = np.any(rgb != frame, axis=2)
    if not content.any():
        return rgb
    ys, xs = np.where(content)
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    margins = (x0, rgb.shape[1] - x1, y0, rgb.shape[0] - y1)
    if max(margins) <= 8:
        return rgb[y0:y1, x0:x1]
    return rgb


def filled_silhouette(mascot_path):
    """Extract and fill the mascot's white shape on the 640px icon canvas."""
    rgb = np.asarray(Image.open(mascot_path).convert("RGB"))
    rgb = trim_presentation_frame(rgb).astype(float)
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    luminance = (red + green + blue) / 3
    neutral = np.maximum.reduce((red, green, blue)) - np.minimum.reduce((red, green, blue)) < 16
    white = neutral & (luminance > 128)
    filled = ndimage.binary_fill_holes(white)
    coverage = np.asarray(
        Image.fromarray(filled.astype(np.uint8) * 255).resize(
            (SIZE, SIZE), Image.Resampling.BILINEAR
        )
    )
    return coverage > 127


def seed_vector():
    return np.array(
        [SEED[role][0] for role in ROLE_ORDER]
        + [SEED[role][1] for role in ROLE_ORDER]
        + [SEED_RADIUS],
        dtype=float,
    )


def role_penalty(parameters):
    penalty = 0.0
    for index, role in enumerate(ROLE_ORDER):
        for value, (lower, upper) in (
            (parameters[index], ROLE_BOUNDS[role][0]),
            (parameters[6 + index], ROLE_BOUNDS[role][1]),
        ):
            if value < lower:
                penalty += (lower - value) ** 2 * BOUNDS_PENALTY
            elif value > upper:
                penalty += (value - upper) ** 2 * BOUNDS_PENALTY
    radius = parameters[12]
    if radius < RADIUS_BOUNDS[0]:
        penalty += (RADIUS_BOUNDS[0] - radius) ** 2 * BOUNDS_PENALTY
    elif radius > RADIUS_BOUNDS[1]:
        penalty += (radius - RADIUS_BOUNDS[1]) ** 2 * BOUNDS_PENALTY
    return penalty


def grid(mask, factor):
    height, width = mask.shape
    scaled_height, scaled_width = height // factor, width // factor
    target = mask[: scaled_height * factor, : scaled_width * factor]
    target = target.reshape(scaled_height, factor, scaled_width, factor).mean(axis=(1, 3)) > 0.5
    y_grid, x_grid = np.mgrid[0:scaled_height, 0:scaled_width]
    x_grid = x_grid.astype(np.float32) * factor + factor / 2
    y_grid = y_grid.astype(np.float32) * factor + factor / 2
    return target, x_grid, y_grid


def circle_masks(parameters, x_grid, y_grid):
    radius_squared = parameters[12] ** 2
    return [
        (x_grid - parameters[index]) ** 2
        + (y_grid - parameters[6 + index]) ** 2
        <= radius_squared
        for index in range(6)
    ]


def detached_pixels(model):
    labels, count = ndimage.label(model)
    if count <= 1:
        return 0
    sizes = ndimage.sum(model, labels, range(1, count + 1))
    return int(sizes.sum() - sizes.max())


def edge_weights(mask, band=6.0):
    """Weight a true two-sided band around the target contour."""
    boundary = mask ^ ndimage.binary_erosion(mask)
    distance_to_boundary = ndimage.distance_transform_edt(~boundary)
    return np.where(distance_to_boundary <= band, 4.0, 1.0).astype(np.float32)


def make_loss(mask, factor):
    target, x_grid, y_grid = grid(mask, factor)
    weights = edge_weights(mask)
    if factor != 1:
        height, width = target.shape
        weights = weights[: height * factor, : width * factor]
        weights = weights.reshape(height, factor, width, factor).mean(axis=(1, 3))

    def loss(parameters):
        masks = circle_masks(parameters, x_grid, y_grid)
        model = ~np.logical_or.reduce(masks)
        false_white = model & ~target
        false_black = ~model & target
        pixel_error = (false_white * FALSE_WHITE_WEIGHT + false_black) * weights
        topology_error = detached_pixels(model) + int(model[0].sum())
        return float(
            pixel_error.sum()
            + topology_error * DETACHED_PIXEL_PENALTY
            + role_penalty(parameters)
        )

    return loss


def layout_metrics(parameters, scale=1):
    sample_count = SIZE * scale
    coordinates = (np.arange(sample_count, dtype=np.float32) + 0.5) / scale
    x_grid, y_grid = np.meshgrid(coordinates, coordinates)
    masks = circle_masks(parameters, x_grid, y_grid)
    union = np.logical_or.reduce(masks)
    model = ~union
    labels, component_count = ndimage.label(model)
    sizes = ndimage.sum(model, labels, range(1, component_count + 1))
    detached = 0.0 if component_count <= 1 else float(sizes.sum() - sizes.max()) / scale**2

    fresh_by_role = {}
    unique_by_role = {}
    previous = np.zeros_like(model)
    for index, role in enumerate(ROLE_ORDER):
        other_masks = masks[:index] + masks[index + 1:]
        other_union = np.logical_or.reduce(other_masks)
        fresh_by_role[role] = float((masks[index] & ~previous).sum()) / scale**2
        unique_by_role[role] = float((masks[index] & ~other_union).sum()) / scale**2
        previous |= masks[index]

    return {
        "components": int(component_count),
        "detached_white_area": detached,
        "top_edge_leaks": float(model[0].sum()) / scale,
        "fresh_area_by_role": fresh_by_role,
        "unique_area_by_role": unique_by_role,
    }


def assert_valid_layout(parameters, scale=CLEAN_SCALE):
    if role_penalty(parameters):
        raise AssertionError("one or more bite parameters left their sketch-derived role bounds")
    metrics = layout_metrics(parameters, scale)
    if metrics["components"] != 1 or metrics["detached_white_area"]:
        raise AssertionError(
            f"silhouette contains {metrics['detached_white_area']:.4f}px of detached white artifacts"
        )
    if metrics["top_edge_leaks"]:
        raise AssertionError(
            f"silhouette leaks {metrics['top_edge_leaks']:.4f}px along the top edge"
        )
    for role in ROLE_ORDER:
        if metrics["fresh_area_by_role"][role] < MIN_FRESH_AREA:
            raise AssertionError(f"{role} has no meaningful fresh bite area")
        if metrics["unique_area_by_role"][role] < MIN_UNIQUE_AREA:
            raise AssertionError(f"{role} is redundant in the final silhouette")
    return metrics


def evaluate_iou(parameters, mask):
    target, x_grid, y_grid = grid(mask, 1)
    model = ~np.logical_or.reduce(circle_masks(parameters, x_grid, y_grid))
    return float((model & target).sum() / (model | target).sum())


def refine(mask, parameters):
    """Polish the sketch-derived seed without sacrificing its hard rules."""
    current = parameters.copy()
    for factor, max_evaluations in ((4, 1400), (2, 1800), (1, 1800)):
        loss = make_loss(mask, factor)
        candidate = optimize.minimize(
            loss,
            current,
            method="Nelder-Mead",
            options={
                "maxiter": max_evaluations,
                "maxfev": max_evaluations,
                "xatol": 0.04,
                "fatol": 0.2,
                "adaptive": True,
            },
        )
        if candidate.fun >= loss(current):
            continue
        try:
            assert_valid_layout(candidate.x)
        except AssertionError:
            continue
        current = candidate.x
    return current


def main():
    mascot = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_MASCOT
    target = filled_silhouette(mascot)
    parameters = refine(target, seed_vector())
    # The JSON and SVG use two decimal places, so validate the values that will
    # actually ship rather than a higher-precision precursor.
    parameters = np.round(parameters, 2)
    metrics = assert_valid_layout(parameters)
    iou = evaluate_iou(parameters, target)
    if iou < 0.99:
        raise SystemExit(f"fit degraded to IoU {iou:.4f}; refusing to write attempt data")

    circles = {
        role: [
            round(float(parameters[index]), 2),
            round(float(parameters[6 + index]), 2),
            round(float(parameters[12]), 2),
        ]
        for index, role in enumerate(ROLE_ORDER)
    }
    document = {
        "source": str(mascot),
        "canvas": "640x640, canvas coordinates",
        "shared_radius": round(float(parameters[12]), 2),
        "ioU_vs_mascot": round(iou, 4),
        "cleanliness_sample_scale": CLEAN_SCALE,
        "detached_white_area": round(metrics["detached_white_area"], 4),
        "fresh_area_by_role": {
            role: round(metrics["fresh_area_by_role"][role], 1) for role in ROLE_ORDER
        },
        "unique_area_by_role": {
            role: round(metrics["unique_area_by_role"][role], 1) for role in ROLE_ORDER
        },
        "circles_by_role": circles,
    }
    OUT_JSON.write_text(json.dumps(document, indent=2) + "\n")
    print(json.dumps(document, indent=2))
    print(f"\nwrote {OUT_JSON}")


if __name__ == "__main__":
    main()
