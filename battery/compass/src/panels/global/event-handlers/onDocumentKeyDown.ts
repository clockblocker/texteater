import type { RegionConstraints } from "../../components/region/types";
import type {
	Orientation,
	RegisteredSplit,
} from "../../components/split/types";
import { assert } from "../../utils/assert";
import { isRightToLeft } from "../dom/isRightToLeft";
import { getMountedSplitState } from "../mutable-state/splits";
import { adjustLayoutForHandle } from "../utils/adjustLayoutForHandle";
import { findHandleSplit } from "../utils/findHandleSplit";

type KeyPress = {
	event: KeyboardEvent;
	handleElement: HTMLElement;
	split: RegisteredSplit;
};

/** What a key does on a focused Handle, once the event is prevented. */
type KeyAction = (press: KeyPress) => void;

/** How far an arrow key moves a Handle, in percent of the Split. */
const ARROW_STEP = 5;

export function onDocumentKeyDown(event: KeyboardEvent) {
	if (event.defaultPrevented) {
		return;
	}

	const handleElement = event.currentTarget as HTMLElement;

	const split = findHandleSplit(handleElement);
	if (split.disabled) {
		return;
	}

	const action = keyActions.get(event.key);
	if (!action) {
		return;
	}

	event.preventDefault();
	action({ event, handleElement, split });
}

/** Moves the Handle by `delta(split)` when the Split runs along `orientation`. */
function moveAlong(
	orientation: Orientation,
	delta: (split: RegisteredSplit) => number,
): KeyAction {
	return ({ handleElement, split }) => {
		if (split.orientation === orientation) {
			adjustLayoutForHandle(handleElement, delta(split));
		}
	};
}

function moveBy(delta: number): KeyAction {
	return ({ handleElement }) => {
		adjustLayoutForHandle(handleElement, delta);
	};
}

const keyActions = new Map<string, KeyAction>([
	["ArrowDown", moveAlong("vertical", () => ARROW_STEP)],
	// The arrows move the handle the way they point, which under dir="rtl"
	// is toward inline-end for ArrowLeft
	[
		"ArrowLeft",
		moveAlong("horizontal", (split) =>
			isRightToLeft(split.element) ? ARROW_STEP : -ARROW_STEP,
		),
	],
	[
		"ArrowRight",
		moveAlong("horizontal", (split) =>
			isRightToLeft(split.element) ? -ARROW_STEP : ARROW_STEP,
		),
	],
	["ArrowUp", moveAlong("vertical", () => -ARROW_STEP)],
	// Moves splitter to the position that gives the primary pane its largest allowed size.
	// This may completely collapse the secondary pane.
	["End", moveBy(100)],
	["Enter", togglePrimaryRegion],
	["F6", focusAdjacentHandle],
	// Moves splitter to the position that gives the primary pane its smallest allowed size.
	// This may completely collapse the primary pane.
	["Home", moveBy(-100)],
]);

/**
 * If the primary pane is not collapsed, collapses the pane.
 * If the pane is collapsed, restores the splitter to its previous position.
 */
function togglePrimaryRegion({ handleElement, split }: KeyPress) {
	const { derivedRegionConstraints, layout, handleToRegions } =
		getMountedSplitState(split.id, true);

	const handle = split.handles.find(
		(current) => current.element === handleElement,
	);
	assert(handle, "Matching handle not found");

	const regions = handleToRegions.get(handle);
	assert(regions, "Matching regions not found");

	const [primaryRegion] = regions;
	const constraints = derivedRegionConstraints.find(
		(current) => current.regionId === primaryRegion.id,
	);
	assert(constraints, "Region metadata not found");

	const prevSize = layout[primaryRegion.id];
	if (!constraints.collapsible || prevSize === undefined) {
		return;
	}

	const nextSize = toggledSize(
		constraints,
		prevSize,
		split.mutableState.expandedRegionSizes[primaryRegion.id],
	);
	adjustLayoutForHandle(handleElement, nextSize - prevSize);
}

/**
 * A collapsed Region's expanded size (or its minimum, without one), or an
 * expanded Region's collapsed size.
 */
function toggledSize(
	constraints: RegionConstraints,
	prevSize: number,
	expandedSize: number | undefined,
) {
	if (constraints.collapsedSize === prevSize) {
		return expandedSize ?? constraints.minSize;
	}
	return constraints.collapsedSize;
}

/** Cycles focus through the Split's Handles, backward with Shift. */
function focusAdjacentHandle({ event, handleElement, split }: KeyPress) {
	const count = split.handles.length;
	const index = split.handles.findIndex(
		(handle) => handle.element === handleElement,
	);
	assert(index !== -1, "Index not found");

	const nextIndex = (index + (event.shiftKey ? count - 1 : 1)) % count;
	split.handles[nextIndex]?.element.focus({
		preventScroll: true,
	});
}
