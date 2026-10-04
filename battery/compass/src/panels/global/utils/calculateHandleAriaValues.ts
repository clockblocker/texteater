import type { RegionConstraints } from "../../components/region/types";
import type { Layout } from "../../components/split/types";
import { adjustLayoutByDelta } from "./adjustLayoutByDelta";
import { validateSplitLayout } from "./validateSplitLayout";

export function calculateHandleAriaValues({
	layout,
	regionConstraints,
	regionId,
	regionIndex,
}: {
	layout: Layout;
	regionConstraints: RegionConstraints[];
	regionId: string;
	regionIndex: number;
}): {
	valueControls: string | undefined;
	valueMax: number | undefined;
	valueMin: number | undefined;
	valueNow: number | undefined;
} {
	let valueMax: number | undefined;
	let valueMin: number | undefined;

	const regionSize = layout[regionId];

	const constraints = regionConstraints.find(
		(current) => current.regionId === regionId,
	);
	if (constraints && regionSize !== undefined) {
		const maxSize = constraints.maxSize;
		const minSize = constraints.collapsible
			? constraints.collapsedSize
			: constraints.minSize;

		const pivotIndices = [regionIndex, regionIndex + 1];

		const minSizeLayout = validateSplitLayout({
			layout: adjustLayoutByDelta({
				delta: minSize - regionSize,
				initialLayout: layout,
				regionConstraints,
				pivotIndices,
				prevLayout: layout,
			}),
			regionConstraints,
		});

		valueMin = minSizeLayout[regionId];

		const maxSizeLayout = validateSplitLayout({
			layout: adjustLayoutByDelta({
				delta: maxSize - regionSize,
				initialLayout: layout,
				regionConstraints,
				pivotIndices,
				prevLayout: layout,
			}),
			regionConstraints,
		});

		valueMax = maxSizeLayout[regionId];
	}

	return {
		valueControls: regionId,
		valueMax,
		valueMin,
		valueNow: regionSize,
	};
}
