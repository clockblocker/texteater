import type { Layout, RegisteredSplit } from "../../components/split/types";
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
	event: {
		clientX: number;
		clientY: number;
		movementX: number;
		movementY: number;
	};
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
		const { rightToLeft, split, splitSize } = current;
		const { orientation, regions } = split;
		const { disableCursor } = split.mutableState;

		let deltaAsPercentage = 0;
		if (pointerDownAtPoint) {
			if (orientation === "horizontal") {
				deltaAsPercentage =
					((event.clientX - pointerDownAtPoint.x) / splitSize) * 100;
			} else {
				deltaAsPercentage =
					((event.clientY - pointerDownAtPoint.y) / splitSize) * 100;
			}
		} else {
			if (orientation === "horizontal") {
				deltaAsPercentage = event.clientX < 0 ? -100 : 100;
			} else {
				deltaAsPercentage = event.clientY < 0 ? -100 : 100;
			}
		}

		const initialLayout = initialLayoutMap.get(split);
		const splitState = mountedSplits.get(split);
		if (!initialLayout || !splitState) {
			return;
		}

		const {
			defaultLayoutDeferred,
			derivedRegionConstraints,
			splitSize: mountedSplitSize,
			layout: prevLayout,
			handleToRegions,
		} = splitState;
		if (derivedRegionConstraints && prevLayout && handleToRegions) {
			const nextLayout = adjustLayoutByDelta({
				// The layout grows inline-start; the delta and cursor flags above
				// are physical
				delta: rightToLeft ? -deltaAsPercentage : deltaAsPercentage,
				initialLayout,
				regionConstraints: derivedRegionConstraints,
				pivotIndices: current.regions.map((region) =>
					regions.indexOf(region),
				),
				prevLayout,
				trigger: "mouse-or-touch",
			});

			if (layoutsEqual(nextLayout, prevLayout)) {
				if (deltaAsPercentage !== 0 && !disableCursor) {
					// An unchanged means the cursor has exceeded the allowed bounds
					switch (orientation) {
						case "horizontal": {
							nextCursorFlags |=
								deltaAsPercentage < 0
									? CURSOR_FLAG_HORIZONTAL_MIN
									: CURSOR_FLAG_HORIZONTAL_MAX;
							break;
						}
						case "vertical": {
							nextCursorFlags |=
								deltaAsPercentage < 0
									? CURSOR_FLAG_VERTICAL_MIN
									: CURSOR_FLAG_VERTICAL_MAX;
							break;
						}
					}
				}
			} else {
				updateMountedSplit(current.split, {
					defaultLayoutDeferred,
					derivedRegionConstraints: derivedRegionConstraints,
					splitSize: mountedSplitSize,
					layout: nextLayout,
					handleToRegions,
				});
			}
		}
	});

	// Edge case
	// Re-use previous horizontal/vertical cursor flags if there's been no movement since the last event
	// This accounts for edge cases in browsers like Firefox that sometimes round clientX/clientY values
	let cursorFlags = 0;
	if (event.movementX === 0) {
		cursorFlags |= prevCursorFlags & CURSOR_FLAGS_HORIZONTAL;
	} else {
		cursorFlags |= nextCursorFlags & CURSOR_FLAGS_HORIZONTAL;
	}
	if (event.movementY === 0) {
		cursorFlags |= prevCursorFlags & CURSOR_FLAGS_VERTICAL;
	} else {
		cursorFlags |= nextCursorFlags & CURSOR_FLAGS_VERTICAL;
	}

	updateCursorFlags(cursorFlags);
	updateCursorStyle(document);
}
