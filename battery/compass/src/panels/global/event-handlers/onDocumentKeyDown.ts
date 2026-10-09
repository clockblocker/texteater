import { assert } from "../../utils/assert";
import { isRightToLeft } from "../dom/isRightToLeft";
import { getMountedSplitState } from "../mutable-state/splits";
import { adjustLayoutForHandle } from "../utils/adjustLayoutForHandle";
import { findHandleSplit } from "../utils/findHandleSplit";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function onDocumentKeyDown(event: KeyboardEvent) {
	if (event.defaultPrevented) {
		return;
	}

	const handleElement = event.currentTarget as HTMLElement;

	const split = findHandleSplit(handleElement);
	if (split.disabled) {
		return;
	}

	switch (event.key) {
		case "ArrowDown": {
			event.preventDefault();

			if (split.orientation === "vertical") {
				adjustLayoutForHandle(handleElement, 5);
			}
			break;
		}
		// The arrows move the handle the way they point, which under dir="rtl"
		// is toward inline-end for ArrowLeft
		case "ArrowLeft": {
			event.preventDefault();

			if (split.orientation === "horizontal") {
				adjustLayoutForHandle(
					handleElement,
					isRightToLeft(split.element) ? 5 : -5,
				);
			}
			break;
		}
		case "ArrowRight": {
			event.preventDefault();

			if (split.orientation === "horizontal") {
				adjustLayoutForHandle(
					handleElement,
					isRightToLeft(split.element) ? -5 : 5,
				);
			}
			break;
		}
		case "ArrowUp": {
			event.preventDefault();

			if (split.orientation === "vertical") {
				adjustLayoutForHandle(handleElement, -5);
			}
			break;
		}
		case "End": {
			event.preventDefault();

			// Moves splitter to the position that gives the primary pane its largest allowed size.
			// This may completely collapse the secondary pane.

			adjustLayoutForHandle(handleElement, 100);
			break;
		}
		case "Enter": {
			event.preventDefault();

			// If the primary pane is not collapsed, collapses the pane.
			// If the pane is collapsed, restores the splitter to its previous position.

			const split = findHandleSplit(handleElement);

			const splitState = getMountedSplitState(split.id, true);
			const { derivedRegionConstraints, layout, handleToRegions } =
				splitState;

			const handle = split.handles.find(
				(current) => current.element === handleElement,
			);
			assert(handle, "Matching handle not found");

			const regions = handleToRegions.get(handle);
			assert(regions, "Matching regions not found");

			const primaryRegion = regions[0];
			const constraints = derivedRegionConstraints.find(
				(current) => current.regionId === primaryRegion.id,
			);
			assert(constraints, "Region metadata not found");

			const prevSize = layout[primaryRegion.id];
			if (constraints.collapsible && prevSize !== undefined) {
				const nextSize =
					constraints.collapsedSize === prevSize
						? (split.mutableState.expandedRegionSizes[
								primaryRegion.id
							] ?? constraints.minSize)
						: constraints.collapsedSize;

				adjustLayoutForHandle(handleElement, nextSize - prevSize);
			}
			break;
		}
		case "F6": {
			event.preventDefault();

			// Cycle through window panes.

			const split = findHandleSplit(handleElement);

			const handleElements = split.handles.map(
				(handle) => handle.element,
			);

			const index = split.handles.findIndex(
				(handle) => handle.element === event.currentTarget,
			);
			assert(index !== null, "Index not found");

			const nextIndex = event.shiftKey
				? index > 0
					? index - 1
					: handleElements.length - 1
				: index + 1 < handleElements.length
					? index + 1
					: 0;

			const nextHandleElement = handleElements[nextIndex] as HTMLElement;
			nextHandleElement.focus({
				preventScroll: true,
			});
			break;
		}
		case "Home": {
			event.preventDefault();

			// Moves splitter to the position that gives the primary pane its smallest allowed size.
			// This may completely collapse the primary pane.

			adjustLayoutForHandle(handleElement, -100);
			break;
		}
	}
}
