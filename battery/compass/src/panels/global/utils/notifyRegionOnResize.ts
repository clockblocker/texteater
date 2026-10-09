import type { RegisteredSplit } from "../../components/split/types";
import { calculateAvailableSplitSize } from "../dom/calculateAvailableSplitSize";
import { formatLayoutNumber } from "./formatLayoutNumber";

export function notifyRegionOnResize(split: RegisteredSplit, element: Element) {
	const region = split.regions.find((current) => current.element === element);
	if (!region?.onResize) {
		return;
	}

	const splitSize = calculateAvailableSplitSize({ split });
	if (splitSize === 0) {
		// A Split with no size can't give the Region a percentage
		// (it could be within a hidden subtree), so there's nothing to report.
		return;
	}

	const regionSize =
		split.orientation === "horizontal"
			? region.element.offsetWidth
			: region.element.offsetHeight;

	const prevSize = region.mutableValues.prevSize;
	const nextSize = {
		asPercentage: formatLayoutNumber((regionSize / splitSize) * 100),
		inPixels: regionSize,
	};
	region.mutableValues.prevSize = nextSize;

	region.onResize(nextSize, region.id, prevSize);
}
