import { assert } from "../../utils/assert";
import {
	getMountedSplitState,
	updateMountedSplit,
} from "../mutable-state/splits";
import { adjustLayoutByDelta } from "./adjustLayoutByDelta";
import { findHandleSplit } from "./findHandleSplit";
import { getImperativeSplitMethods } from "./getImperativeSplitMethods";
import { layoutsEqual } from "./layoutsEqual";
import { validateSplitLayout } from "./validateSplitLayout";

export function adjustLayoutForHandle(
	handleElement: HTMLElement,
	delta: number,
) {
	const split = findHandleSplit(handleElement);
	const splitState = getMountedSplitState(split.id, true);

	const handle = split.handles.find(
		(current) => current.element === handleElement,
	);
	assert(handle, "Matching handle not found");

	const regions = splitState.handleToRegions.get(handle);
	assert(regions, "Matching regions not found");

	const pivotIndices = regions.map((region) => split.regions.indexOf(region));

	const splitAPI = getImperativeSplitMethods({ splitId: split.id });
	const prevLayout = splitAPI.getLayout();

	const unsafeLayout = adjustLayoutByDelta({
		delta,
		initialLayout: prevLayout,
		regionConstraints: splitState.derivedRegionConstraints,
		pivotIndices,
		prevLayout,
		trigger: "keyboard",
	});
	const nextLayout = validateSplitLayout({
		layout: unsafeLayout,
		regionConstraints: splitState.derivedRegionConstraints,
	});

	if (!layoutsEqual(prevLayout, nextLayout)) {
		updateMountedSplit(
			split,
			{
				defaultLayoutDeferred: splitState.defaultLayoutDeferred,
				derivedRegionConstraints: splitState.derivedRegionConstraints,
				splitSize: splitState.splitSize,
				layout: nextLayout,
				handleToRegions: splitState.handleToRegions,
			},
			// Keyboard resizes (arrow keys, Home/End, Enter collapse/expand) originate
			// from a real DOM event on the handle, so they are user interactions
			// just like pointer drags. This function is only reached from
			// onDocumentKeyDown. See #716.
			{ isUserInteraction: true },
		);
	}
}
