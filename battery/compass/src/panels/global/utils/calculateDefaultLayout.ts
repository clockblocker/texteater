import type { Layout } from "../../components/group/types";
import type { PanelConstraints } from "../../components/panel/types";
import { formatLayoutNumber } from "./formatLayoutNumber";

export function calculateDefaultLayout(
	derivedPanelConstraints: PanelConstraints[],
): Layout {
	let explicitCount = 0;
	let total = 0;

	for (const current of derivedPanelConstraints) {
		if (current.defaultSize !== undefined) {
			explicitCount++;
			total += formatLayoutNumber(current.defaultSize);
		}
	}

	// Panels without a default size share what the others leave
	const remainingPanelCount = derivedPanelConstraints.length - explicitCount;
	const remainingSize =
		remainingPanelCount === 0
			? 0
			: formatLayoutNumber((100 - total) / remainingPanelCount);

	// Keys follow Panel order, which simplifies traversal elsewhere
	const layout: Layout = {};
	for (const current of derivedPanelConstraints) {
		layout[current.panelId] =
			current.defaultSize === undefined
				? remainingSize
				: formatLayoutNumber(current.defaultSize);
	}

	return layout;
}
