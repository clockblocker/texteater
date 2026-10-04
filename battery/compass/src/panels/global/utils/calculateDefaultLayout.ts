import type { RegionConstraints } from "../../components/region/types";
import type { Layout } from "../../components/split/types";
import { formatLayoutNumber } from "./formatLayoutNumber";

export function calculateDefaultLayout(
	derivedRegionConstraints: RegionConstraints[],
): Layout {
	let explicitCount = 0;
	let total = 0;

	for (const current of derivedRegionConstraints) {
		if (current.defaultSize !== undefined) {
			explicitCount++;
			total += formatLayoutNumber(current.defaultSize);
		}
	}

	// Regions without a default size share what the others leave
	const remainingRegionCount =
		derivedRegionConstraints.length - explicitCount;
	const remainingSize =
		remainingRegionCount === 0
			? 0
			: formatLayoutNumber((100 - total) / remainingRegionCount);

	// Keys follow Region order, which simplifies traversal elsewhere
	const layout: Layout = {};
	for (const current of derivedRegionConstraints) {
		layout[current.regionId] =
			current.defaultSize === undefined
				? remainingSize
				: formatLayoutNumber(current.defaultSize);
	}

	return layout;
}
