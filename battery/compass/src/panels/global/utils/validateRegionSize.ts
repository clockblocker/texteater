import type { RegionConstraints } from "../../components/region/types";
import { compareLayoutNumbers } from "./compareLayoutNumbers";
import { formatLayoutNumber } from "./formatLayoutNumber";

// Region size must be in percentages; pixel values should be pre-converted
export function validateRegionSize({
	overrideDisabledRegions,
	regionConstraints,
	prevSize,
	size,
}: {
	overrideDisabledRegions?: boolean;
	regionConstraints: RegionConstraints;
	prevSize: number;
	size: number;
}) {
	const {
		collapsedSize = 0,
		collapsible,
		disabled,
		maxSize = 100,
		minSize = 0,
	} = regionConstraints;

	if (disabled && !overrideDisabledRegions) {
		return prevSize;
	}

	if (compareLayoutNumbers(size, minSize) < 0) {
		if (collapsible) {
			// Collapsible regions should snap closed or open only once they cross the halfway point between collapsed and min size.
			const halfwayPoint = (collapsedSize + minSize) / 2;
			if (compareLayoutNumbers(size, halfwayPoint) < 0) {
				size = collapsedSize;
			} else {
				size = minSize;
			}
		} else {
			size = minSize;
		}
	}

	size = Math.min(maxSize, size);
	size = formatLayoutNumber(size);

	return size;
}
