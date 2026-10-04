import type { RegisteredSplit } from "../../components/split/types";

export function calculateAvailableSplitSize({
	split,
}: {
	split: RegisteredSplit;
}) {
	const { orientation, regions } = split;

	return regions.reduce((totalSize, region) => {
		totalSize +=
			orientation === "horizontal"
				? region.element.offsetWidth
				: region.element.offsetHeight;
		return totalSize;
	}, 0);
}
