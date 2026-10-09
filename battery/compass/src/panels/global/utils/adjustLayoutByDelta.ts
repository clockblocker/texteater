import type { RegionConstraints } from "../../components/region/types";
import type { Layout } from "../../components/split/types";
import { assert } from "../../utils/assert";
import { isArrayEqual } from "../../utils/isArrayEqual";
import { compareLayoutNumbers } from "../utils/compareLayoutNumbers";
import { layoutNumbersEqual } from "../utils/layoutNumbersEqual";
import { validateRegionSize } from "../utils/validateRegionSize";

/** What every step of a delta's adjustment reads. */
type Adjustment = Readonly<{
	initialLayout: number[];
	regionConstraintsArray: RegionConstraints[];
	firstPivotIndex: number;
	secondPivotIndex: number;
	overrideDisabledRegions: boolean;
}>;

// All units must be in percentages; pixel values should be pre-converted
export function adjustLayoutByDelta({
	delta,
	initialLayout: initialLayoutProp,
	regionConstraints: regionConstraintsArray,
	pivotIndices,
	prevLayout: prevLayoutProp,
	trigger,
}: {
	delta: number;
	initialLayout: Layout;
	regionConstraints: RegionConstraints[];
	pivotIndices: number[];
	prevLayout: Layout;
	trigger?: "imperative-api" | "keyboard" | "mouse-or-touch";
}): Layout {
	if (layoutNumbersEqual(delta, 0)) {
		return initialLayoutProp;
	}

	const initialLayout = Object.values(initialLayoutProp);
	const prevLayout = Object.values(prevLayoutProp);
	const nextLayout = [...initialLayout];

	const [firstPivotIndex, secondPivotIndex] = pivotIndices;
	assert(firstPivotIndex != null, "Invalid first pivot index");
	assert(secondPivotIndex != null, "Invalid second pivot index");

	const adjustment: Adjustment = {
		initialLayout,
		regionConstraintsArray,
		firstPivotIndex,
		secondPivotIndex,
		overrideDisabledRegions: trigger === "imperative-api",
	};

	delta =
		trigger === "keyboard"
			? keyboardDelta(adjustment, delta)
			: pointerDelta(adjustment, delta);
	delta = availableDelta(adjustment, delta);

	const deltaApplied = shrinkRegions(adjustment, delta, nextLayout);

	// If we were unable to resize any of the regions regions, return the previous state.
	// This will essentially bailout and ignore e.g. drags past a region's boundaries
	if (isArrayEqual(prevLayout, nextLayout)) {
		return prevLayoutProp;
	}

	growPivotRegion(adjustment, delta, deltaApplied, nextLayout);

	const totalSize = Object.values(nextLayout).reduce(
		(total, size) => size + total,
		0,
	);

	// If our new layout doesn't add up to 100%, that means the requested delta can't be applied
	// In that case, fall back to our most recent valid layout
	// Allow for a small rounding difference, else e.g. 3 region layouts may never be considered valid
	if (!layoutNumbersEqual(totalSize, 100, 0.1)) {
		return prevLayoutProp;
	}

	const prevLayoutKeys = Object.keys(prevLayoutProp);

	return nextLayout.reduce<Layout>((accumulated, current, index) => {
		const key = prevLayoutKeys[index];
		assert(key != null, `Previous layout key not found for index ${index}`);
		accumulated[key] = current;
		return accumulated;
	}, {});
}

function sizeAt(layout: number[], index: number): number {
	const size = layout[index];
	assert(size != null, `Previous layout not found for region index ${index}`);
	return size;
}

function constraintsAt(
	regionConstraintsArray: RegionConstraints[],
	index: number,
	message = `Region constraints not found for index ${index}`,
): RegionConstraints {
	const regionConstraints = regionConstraintsArray[index];
	assert(regionConstraints, message);
	return regionConstraints;
}

/**
 * If this is a resize triggered by a keyboard event, our logic for
 * expanding/collapsing is different. We no longer check the halfway
 * threshold because this may prevent the region from expanding at all.
 */
function keyboardDelta(adjustment: Adjustment, delta: number): number {
	return collapseAtMinimumDelta(
		adjustment,
		expandCollapsedDelta(adjustment, delta),
	);
}

/** Check if we should expand a collapsed region. */
function expandCollapsedDelta(
	{
		initialLayout,
		regionConstraintsArray,
		firstPivotIndex,
		secondPivotIndex,
	}: Adjustment,
	delta: number,
): number {
	const index = delta < 0 ? secondPivotIndex : firstPivotIndex;
	const {
		collapsedSize = 0,
		collapsible,
		minSize = 0,
	} = constraintsAt(regionConstraintsArray, index);
	if (!collapsible) {
		return delta;
	}

	const prevSize = sizeAt(initialLayout, index);
	if (!layoutNumbersEqual(prevSize, collapsedSize)) {
		return delta;
	}

	const localDelta = minSize - prevSize;
	if (compareLayoutNumbers(localDelta, Math.abs(delta)) > 0) {
		return delta < 0 ? 0 - localDelta : localDelta;
	}
	return delta;
}

/** Check if we should collapse a region at its minimum size. */
function collapseAtMinimumDelta(
	{
		initialLayout,
		regionConstraintsArray,
		firstPivotIndex,
		secondPivotIndex,
	}: Adjustment,
	delta: number,
): number {
	const index = delta < 0 ? firstPivotIndex : secondPivotIndex;
	const {
		collapsedSize = 0,
		collapsible,
		minSize = 0,
	} = constraintsAt(
		regionConstraintsArray,
		index,
		`No region constraints found for index ${index}`,
	);
	if (!collapsible) {
		return delta;
	}

	const prevSize = sizeAt(initialLayout, index);
	if (!layoutNumbersEqual(prevSize, minSize)) {
		return delta;
	}

	const localDelta = prevSize - collapsedSize;
	if (compareLayoutNumbers(localDelta, Math.abs(delta)) > 0) {
		return delta < 0 ? 0 - localDelta : localDelta;
	}
	return delta;
}

/**
 * If we're starting from a collapsed state, dragging past the halfway point
 * should cause the region to expand. This can happen for positive or
 * negative drags, and regions on either side of the handle can be
 * collapsible. The easiest way to support this is to detect this scenario
 * and pre-adjust the delta before applying the rest of the layout algorithm.
 */
function pointerDelta(
	{
		initialLayout,
		regionConstraintsArray,
		firstPivotIndex,
		secondPivotIndex,
	}: Adjustment,
	delta: number,
): number {
	const index = delta < 0 ? secondPivotIndex : firstPivotIndex;
	const regionConstraints = constraintsAt(regionConstraintsArray, index);
	const prevSize = sizeAt(initialLayout, index);

	const { collapsible, collapsedSize, minSize } = regionConstraints;
	if (!collapsible || compareLayoutNumbers(prevSize, minSize) >= 0) {
		return delta;
	}

	const gapSize = minSize - collapsedSize;
	if (delta > 0) {
		const halfwayDelta = gapSize / 2;
		const nextSize = prevSize + delta;
		if (compareLayoutNumbers(nextSize, minSize) >= 0) {
			return delta;
		}
		return compareLayoutNumbers(delta, halfwayDelta) <= 0 ? 0 : gapSize;
	}

	const halfwayDelta = 100 - gapSize / 2;
	const nextSize = prevSize - delta;
	if (compareLayoutNumbers(nextSize, minSize) >= 0) {
		return delta;
	}
	return compareLayoutNumbers(100 + delta, halfwayDelta) > 0 ? 0 : -gapSize;
}

/**
 * Pre-calculate max available delta in the opposite direction of our pivot.
 * This will be the maximum amount we're allowed to expand/contract the
 * regions in the primary direction. If this amount is less than the
 * requested delta, adjust the requested delta. If this amount is greater
 * than the requested delta, that's useful information too– as an expanding
 * region might change from collapsed to min size.
 */
function availableDelta(
	{
		initialLayout,
		regionConstraintsArray,
		firstPivotIndex,
		secondPivotIndex,
		overrideDisabledRegions,
	}: Adjustment,
	delta: number,
): number {
	const increment = delta < 0 ? 1 : -1;

	let index = delta < 0 ? secondPivotIndex : firstPivotIndex;
	let maxAvailableDelta = 0;

	while (true) {
		const prevSize = sizeAt(initialLayout, index);
		const regionConstraints = constraintsAt(regionConstraintsArray, index);

		const maxSafeSize = validateRegionSize({
			overrideDisabledRegions,
			regionConstraints,
			prevSize,
			size: 100,
		});

		maxAvailableDelta += maxSafeSize - prevSize;
		index += increment;

		if (index < 0 || index >= regionConstraintsArray.length) {
			break;
		}
	}

	const minAbsDelta = Math.min(Math.abs(delta), Math.abs(maxAvailableDelta));
	return delta < 0 ? 0 - minAbsDelta : minAbsDelta;
}

/**
 * Delta added to a region needs to be subtracted from other regions (within
 * the constraints that those regions allow). Returns the delta applied.
 */
function shrinkRegions(
	{
		initialLayout,
		regionConstraintsArray,
		firstPivotIndex,
		secondPivotIndex,
		overrideDisabledRegions,
	}: Adjustment,
	delta: number,
	nextLayout: number[],
): number {
	let deltaApplied = 0;
	let index = delta < 0 ? firstPivotIndex : secondPivotIndex;
	while (index >= 0 && index < regionConstraintsArray.length) {
		const deltaRemaining = Math.abs(delta) - Math.abs(deltaApplied);

		const prevSize = sizeAt(initialLayout, index);
		const regionConstraints = constraintsAt(regionConstraintsArray, index);

		const unsafeSize = prevSize - deltaRemaining;
		const safeSize = validateRegionSize({
			overrideDisabledRegions,
			regionConstraints,
			prevSize,
			size: unsafeSize,
		});

		if (!layoutNumbersEqual(prevSize, safeSize)) {
			deltaApplied += prevSize - safeSize;

			nextLayout[index] = safeSize;

			if (
				deltaApplied
					.toFixed(3)
					.localeCompare(Math.abs(delta).toFixed(3), undefined, {
						numeric: true,
					}) >= 0
			) {
				break;
			}
		}

		index += delta < 0 ? -1 : 1;
	}
	return deltaApplied;
}

/**
 * Now distribute the applied delta to the regions in the other direction:
 * adjust the pivot region before, but only by the amount that surrounding
 * regions were able to shrink/contract.
 */
function growPivotRegion(
	adjustment: Adjustment,
	delta: number,
	deltaApplied: number,
	nextLayout: number[],
) {
	const { initialLayout, regionConstraintsArray, overrideDisabledRegions } =
		adjustment;
	const pivotIndex =
		delta < 0 ? adjustment.secondPivotIndex : adjustment.firstPivotIndex;

	const prevSize = sizeAt(initialLayout, pivotIndex);
	const regionConstraints = constraintsAt(regionConstraintsArray, pivotIndex);

	const unsafeSize = prevSize + deltaApplied;
	const safeSize = validateRegionSize({
		overrideDisabledRegions,
		regionConstraints,
		prevSize,
		size: unsafeSize,
	});

	nextLayout[pivotIndex] = safeSize;

	// Edge case where expanding or contracting one region caused another one to change collapsed state
	if (!layoutNumbersEqual(safeSize, unsafeSize)) {
		redistribute(adjustment, delta, unsafeSize - safeSize, nextLayout);
	}
}

/** Spread what the pivot region could not take over the regions past it. */
function redistribute(
	{
		regionConstraintsArray,
		firstPivotIndex,
		secondPivotIndex,
		overrideDisabledRegions,
	}: Adjustment,
	delta: number,
	deltaRemaining: number,
	nextLayout: number[],
) {
	let index = delta < 0 ? secondPivotIndex : firstPivotIndex;
	while (index >= 0 && index < regionConstraintsArray.length) {
		const prevSize = sizeAt(nextLayout, index);
		const regionConstraints = constraintsAt(regionConstraintsArray, index);

		const unsafeSize = prevSize + deltaRemaining;
		const safeSize = validateRegionSize({
			overrideDisabledRegions,
			regionConstraints,
			prevSize,
			size: unsafeSize,
		});

		if (!layoutNumbersEqual(prevSize, safeSize)) {
			deltaRemaining -= safeSize - prevSize;

			nextLayout[index] = safeSize;
		}

		if (layoutNumbersEqual(deltaRemaining, 0)) {
			break;
		}

		index += delta > 0 ? -1 : 1;
	}
}
