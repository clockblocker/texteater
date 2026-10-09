import type {
	Layout,
	Orientation,
	RegisteredSplit,
} from "../../components/split/types";
import {
	CURSOR_FLAG_HORIZONTAL_MAX,
	CURSOR_FLAG_HORIZONTAL_MIN,
	CURSOR_FLAG_VERTICAL_MAX,
	CURSOR_FLAG_VERTICAL_MIN,
	CURSOR_FLAGS_HORIZONTAL,
	CURSOR_FLAGS_VERTICAL,
} from "../../constants";
import type { Point } from "../../types";
import { updateCursorStyle } from "../cursor/updateCursorStyle";
import type { HitArea } from "../dom/calculateHitAreas";
import { updateCursorFlags } from "../mutable-state/interactions";
import {
	type MountedSplits,
	updateMountedSplit,
} from "../mutable-state/splits";
import { adjustLayoutByDelta } from "./adjustLayoutByDelta";
import { layoutsEqual } from "./layoutsEqual";

type PointerMove = {
	clientX: number;
	clientY: number;
	movementX: number;
	movementY: number;
};

export function updateActiveHitAreas({
	document,
	event,
	hitAreas,
	initialLayoutMap,
	mountedSplits,
	pointerDownAtPoint,
	prevCursorFlags,
}: {
	document: Document;
	event: PointerMove;
	hitAreas: HitArea[];
	initialLayoutMap: Map<RegisteredSplit, Layout>;
	mountedSplits: MountedSplits;
	pointerDownAtPoint?: Point;
	prevCursorFlags: number;
}) {
	let nextCursorFlags = 0;

	// Note that HitAreas are frozen once a drag has started
	// Modify the Split layouts for all matching HitAreas though
	hitAreas.forEach((current) => {
		nextCursorFlags |= adjustSplitOfHitArea({
			current,
			delta: deltaAsPercentage(current, event, pointerDownAtPoint),
			initialLayoutMap,
			mountedSplits,
		});
	});

	updateCursorFlags(
		mergeCursorFlags(prevCursorFlags, nextCursorFlags, event),
	);
	updateCursorStyle(document);
}

// The pointer's travel since pointer-down as a percentage of the Split's size,
// or ±100 (towards the pointer's side) when there is no pointer-down point
function deltaAsPercentage(
	{ split, splitSize }: HitArea,
	event: PointerMove,
	pointerDownAtPoint: Point | undefined,
): number {
	const horizontal = split.orientation === "horizontal";
	const client = horizontal ? event.clientX : event.clientY;
	if (!pointerDownAtPoint) {
		return client < 0 ? -100 : 100;
	}
	const downAt = horizontal ? pointerDownAtPoint.x : pointerDownAtPoint.y;
	return ((client - downAt) / splitSize) * 100;
}

// Writes the hit area's Split layout moved by delta, and returns the cursor
// flag to raise when the delta cannot move it
function adjustSplitOfHitArea({
	current,
	delta,
	initialLayoutMap,
	mountedSplits,
}: {
	current: HitArea;
	delta: number;
	initialLayoutMap: Map<RegisteredSplit, Layout>;
	mountedSplits: MountedSplits;
}): number {
	const { rightToLeft, split } = current;
	const initialLayout = initialLayoutMap.get(split);
	const splitState = mountedSplits.get(split);
	if (!initialLayout || !splitState) {
		return 0;
	}

	const {
		defaultLayoutDeferred,
		derivedRegionConstraints,
		splitSize,
		layout: prevLayout,
		handleToRegions,
	} = splitState;
	const nextLayout = adjustLayoutByDelta({
		// The layout grows inline-start; the delta and cursor flags are physical
		delta: rightToLeft ? -delta : delta,
		initialLayout,
		regionConstraints: derivedRegionConstraints,
		pivotIndices: current.regions.map((region) =>
			split.regions.indexOf(region),
		),
		prevLayout,
		trigger: "mouse-or-touch",
	});

	if (layoutsEqual(nextLayout, prevLayout)) {
		// An unchanged layout means the cursor has exceeded the allowed bounds
		return delta !== 0 && !split.mutableState.disableCursor
			? limitCursorFlag(split.orientation, delta)
			: 0;
	}
	updateMountedSplit(split, {
		defaultLayoutDeferred,
		derivedRegionConstraints,
		splitSize,
		layout: nextLayout,
		handleToRegions,
	});
	return 0;
}

function limitCursorFlag(orientation: Orientation, delta: number): number {
	switch (orientation) {
		case "horizontal":
			return delta < 0
				? CURSOR_FLAG_HORIZONTAL_MIN
				: CURSOR_FLAG_HORIZONTAL_MAX;
		case "vertical":
			return delta < 0
				? CURSOR_FLAG_VERTICAL_MIN
				: CURSOR_FLAG_VERTICAL_MAX;
	}
}

// Edge case
// Re-use previous horizontal/vertical cursor flags if there's been no movement since the last event
// This accounts for edge cases in browsers like Firefox that sometimes round clientX/clientY values
function mergeCursorFlags(
	prev: number,
	next: number,
	{ movementX, movementY }: PointerMove,
): number {
	return (
		((movementX === 0 ? prev : next) & CURSOR_FLAGS_HORIZONTAL) |
		((movementY === 0 ? prev : next) & CURSOR_FLAGS_VERTICAL)
	);
}
