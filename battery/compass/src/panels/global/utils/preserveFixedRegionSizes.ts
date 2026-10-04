import type { Layout, RegisteredSplit } from "../../components/split/types";
import { formatLayoutNumber } from "./formatLayoutNumber";

export function preserveFixedRegionSizes({
	split,
	nextSplitSize,
	prevSplitSize,
	prevLayout,
}: {
	split: RegisteredSplit;
	nextSplitSize: number;
	prevSplitSize: number;
	prevLayout: Layout;
}) {
	if (
		prevSplitSize <= 0 ||
		nextSplitSize <= 0 ||
		prevSplitSize === nextSplitSize
	) {
		return prevLayout;
	}

	let fixedRegionsTotalSize = 0;
	let flexibleRegionsTotalPrevSize = 0;
	let hasPreservePixelSizeRegions = false;

	const fixedRegions = new Map<string, number>();
	const flexibleRegionIds: string[] = [];

	for (const region of split.regions) {
		const prevRegionSize = prevLayout[region.id] ?? 0;
		switch (region.regionConstraints.splitResizeBehavior) {
			case "preserve-pixel-size": {
				hasPreservePixelSizeRegions = true;

				const prevRegionSizeInPixels =
					(prevRegionSize / 100) * prevSplitSize;
				const nextRegionSize = formatLayoutNumber(
					(prevRegionSizeInPixels / nextSplitSize) * 100,
				);

				fixedRegions.set(region.id, nextRegionSize);
				fixedRegionsTotalSize += nextRegionSize;
				break;
			}
			default: {
				flexibleRegionIds.push(region.id);
				flexibleRegionsTotalPrevSize += prevRegionSize;
				break;
			}
		}
	}

	if (!hasPreservePixelSizeRegions || flexibleRegionIds.length === 0) {
		return prevLayout;
	}

	const remainingSize = 100 - fixedRegionsTotalSize;
	const nextLayout = { ...prevLayout };

	fixedRegions.forEach((size, regionId) => {
		nextLayout[regionId] = size;
	});

	if (flexibleRegionsTotalPrevSize > 0) {
		for (const regionId of flexibleRegionIds) {
			const prevSize = prevLayout[regionId] ?? 0;
			nextLayout[regionId] = formatLayoutNumber(
				(prevSize / flexibleRegionsTotalPrevSize) * remainingSize,
			);
		}
	} else {
		const evenSize = formatLayoutNumber(
			remainingSize / flexibleRegionIds.length,
		);
		for (const regionId of flexibleRegionIds) {
			nextLayout[regionId] = evenSize;
		}
	}

	return nextLayout;
}
