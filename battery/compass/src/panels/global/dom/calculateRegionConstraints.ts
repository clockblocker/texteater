import type { RegionConstraints } from "../../components/region/types";
import type { RegisteredSplit } from "../../components/split/types";
import { sizeStyleToPixels } from "../styles/sizeStyleToPixels";
import { formatLayoutNumber } from "../utils/formatLayoutNumber";
import { calculateAvailableSplitSize } from "./calculateAvailableSplitSize";

export function calculateRegionConstraints(split: RegisteredSplit) {
	const { regions } = split;

	const splitSize = calculateAvailableSplitSize({ split });
	if (splitSize === 0) {
		// Can't calculate anything meaningful if the split has a width/height of 0
		// (This could indicate that it's within a hidden subtree)
		return regions.map<RegionConstraints>((current) => ({
			splitResizeBehavior: current.regionConstraints.splitResizeBehavior,
			collapsedSize: 0,
			collapsible: current.regionConstraints.collapsible === true,
			defaultSize: undefined,
			disabled: current.regionConstraints.disabled,
			minSize: 0,
			maxSize: 100,
			regionId: current.id,
		}));
	}

	return regions.map<RegionConstraints>((region) => {
		const { element, regionConstraints } = region;

		let collapsedSize = 0;
		if (regionConstraints.collapsedSize !== undefined) {
			const pixels = sizeStyleToPixels({
				splitSize,
				regionElement: element,
				styleProp: regionConstraints.collapsedSize,
			});

			collapsedSize = formatLayoutNumber((pixels / splitSize) * 100);
		}

		let defaultSize: number | undefined;
		if (regionConstraints.defaultSize !== undefined) {
			const pixels = sizeStyleToPixels({
				splitSize,
				regionElement: element,
				styleProp: regionConstraints.defaultSize,
			});

			defaultSize = formatLayoutNumber((pixels / splitSize) * 100);
		}

		let minSize = 0;
		if (regionConstraints.minSize !== undefined) {
			const pixels = sizeStyleToPixels({
				splitSize,
				regionElement: element,
				styleProp: regionConstraints.minSize,
			});

			minSize = formatLayoutNumber((pixels / splitSize) * 100);
		}

		let maxSize = 100;
		if (regionConstraints.maxSize !== undefined) {
			const pixels = sizeStyleToPixels({
				splitSize,
				regionElement: element,
				styleProp: regionConstraints.maxSize,
			});

			maxSize = formatLayoutNumber((pixels / splitSize) * 100);
		}

		return {
			splitResizeBehavior: regionConstraints.splitResizeBehavior,
			collapsedSize,
			collapsible: regionConstraints.collapsible === true,
			defaultSize,
			disabled: regionConstraints.disabled,
			minSize,
			maxSize,
			regionId: region.id,
		};
	});
}
