import type {
	RegionConstraints,
	RegisteredRegion,
} from "../../components/region/types";
import type { Layout } from "../../components/split/types";
import { calculateAvailableSplitSize } from "../dom/calculateAvailableSplitSize";
import {
	getMountedSplitState,
	getRegisteredSplit,
	updateMountedSplit,
} from "../mutable-state/splits";
import { sizeStyleToPixels } from "../styles/sizeStyleToPixels";
import { adjustLayoutByDelta } from "./adjustLayoutByDelta";
import { formatLayoutNumber } from "./formatLayoutNumber";
import { layoutNumbersEqual } from "./layoutNumbersEqual";
import { layoutsEqual } from "./layoutsEqual";
import { validateSplitLayout } from "./validateSplitLayout";

/**
 * Compute the next (unvalidated) layout when resizing a region programmatically.
 *
 * Handles two edge cases for the last region:
 * 1. Single region in the split — no sibling exists to form valid pivot indices.
 * 2. All preceding regions are already collapsed — the normal reversed-delta
 *    logic would cascade the freed space to the first region. Instead the last
 *    region keeps the remainder so it stays the largest.
 */
function computeResizedLayout({
	regionId,
	prevSize,
	nextSize,
	regions,
	prevLayout,
	derivedRegionConstraints,
}: {
	regionId: string;
	prevSize: number;
	nextSize: number;
	regions: RegisteredRegion[];
	prevLayout: Layout;
	derivedRegionConstraints: RegionConstraints[];
}): Layout {
	const index = regions.findIndex((current) => current.id === regionId);
	const isFirstRegion = index === 0;
	const isLastRegion = index === regions.length - 1;

	const allPreviousCollapsed =
		isLastRegion &&
		nextSize < prevSize &&
		(isFirstRegion ||
			regions.slice(0, index).every((_region, regionIndex) => {
				const pc = derivedRegionConstraints[regionIndex];
				if (!pc?.collapsible) {
					return false;
				}
				const size = prevLayout[pc.regionId];
				return (
					size !== undefined &&
					layoutNumbersEqual(pc.collapsedSize, size)
				);
			}));

	if (allPreviousCollapsed) {
		const occupiedByPrevious = regions
			.slice(0, index)
			.reduce((total, region) => total + (prevLayout[region.id] ?? 0), 0);
		return {
			...prevLayout,
			[regionId]: formatLayoutNumber(100 - occupiedByPrevious),
		};
	}

	return adjustLayoutByDelta({
		delta: isLastRegion ? prevSize - nextSize : nextSize - prevSize,
		initialLayout: prevLayout,
		regionConstraints: derivedRegionConstraints,
		pivotIndices: isLastRegion ? [index - 1, index] : [index, index + 1],
		prevLayout,
		trigger: "imperative-api",
	});
}

export function resizeRegion(
	splitId: string,
	regionId: string,
	size: number | string,
) {
	const split = getRegisteredSplit(splitId, true);
	const splitState = getMountedSplitState(splitId, true);

	const region = split.regions.find((current) => current.id === regionId);
	if (region === undefined) {
		throw Error(`Layout not found for Region ${regionId}`);
	}

	const prevSize = splitState.layout[regionId];
	if (prevSize === undefined) {
		throw Error(`Layout not found for Region ${regionId}`);
	}

	const availableSplitSize = calculateAvailableSplitSize({ split });
	const asPixels = sizeStyleToPixels({
		splitSize: availableSplitSize,
		regionElement: region.element,
		styleProp: size,
	});
	const nextSize = formatLayoutNumber((asPixels / availableSplitSize) * 100);
	if (nextSize === prevSize) {
		return;
	}

	const unsafeLayout = computeResizedLayout({
		regionId,
		prevSize,
		nextSize,
		regions: split.regions,
		prevLayout: splitState.layout,
		derivedRegionConstraints: splitState.derivedRegionConstraints,
	});

	const nextLayout = validateSplitLayout({
		layout: unsafeLayout,
		regionConstraints: splitState.derivedRegionConstraints,
	});
	if (!layoutsEqual(splitState.layout, nextLayout)) {
		updateMountedSplit(split, {
			...splitState,
			layout: nextLayout,
		});
	}
}
