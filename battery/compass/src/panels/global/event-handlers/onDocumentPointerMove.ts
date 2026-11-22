import { updateCursorStyle } from "../cursor/updateCursorStyle";
import type { HitArea } from "../dom/calculateHitAreas";
import {
	getInteractionState,
	updateInteractionState,
} from "../mutable-state/interactions";
import {
	getMountedSplitState,
	getMountedSplits,
	updateMountedSplit,
} from "../mutable-state/splits";
import { findMatchingHitAreas } from "../utils/findMatchingHitAreas";
import { updateActiveHitAreas } from "../utils/updateActiveHitArea";

function sameHoverHitAreas(prev: HitArea[], next: HitArea[]): boolean {
	if (prev.length !== next.length) {
		return false;
	}
	for (let index = 0; index < prev.length; index++) {
		const prevArea = prev[index];
		const nextArea = next[index];
		if (
			prevArea?.handle !== nextArea?.handle ||
			prevArea?.split !== nextArea?.split
		) {
			return false;
		}
	}
	return true;
}

export function onDocumentPointerMove(event: PointerEvent) {
	if (event.defaultPrevented) {
		return;
	}

	const interactionState = getInteractionState();
	const mountedSplits = getMountedSplits();

	switch (interactionState.state) {
		case "active": {
			// Edge case (see #340)
			// Detect when the pointer has been released outside an iframe on a different domain
			if (
				// Skip this check for "pointerleave" events, else Firefox triggers a false positive (see #514)
				event.buttons === 0
			) {
				updateInteractionState({
					cursorFlags: 0,
					state: "inactive",
				});

				// Dispatch one more "change" event after the interaction state has been reset.
				// Splits use this as a signal to call onLayoutChanged.
				// This is the missed-pointerup fallback (pointer released outside a
				// cross-origin iframe, see #340) — still a real user interaction.
				interactionState.hitAreas.forEach((hitArea) => {
					// Skip if the split was re-registered mid-gesture, so the old hit region
					// doesn't resurrect a stale entry in the mounted-splits map. See #729.
					if (!mountedSplits.has(hitArea.split)) {
						return;
					}
					const splitState = getMountedSplitState(
						hitArea.split.id,
						true,
					);
					updateMountedSplit(hitArea.split, splitState, {
						isUserInteraction: true,
					});
				});

				return;
			}

			for (const hitArea of interactionState.hitAreas) {
				if (hitArea.handle) {
					const { element } = hitArea.handle;
					if (!element.hasPointerCapture?.(event.pointerId)) {
						element.setPointerCapture?.(event.pointerId);
					}
				}
			}

			if (interactionState.hitAreas.length > 0) {
				updateActiveHitAreas({
					document: event.currentTarget as Document,
					event,
					hitAreas: interactionState.hitAreas,
					initialLayoutMap: interactionState.initialLayoutMap,
					mountedSplits,
					pointerDownAtPoint: interactionState.pointerDownAtPoint,
					prevCursorFlags: interactionState.cursorFlags,
				});
			}
			break;
		}
		default: {
			// Update HitAreas if a drag has not been started
			const hitAreas = findMatchingHitAreas(event, mountedSplits);

			if (hitAreas.length === 0) {
				if (interactionState.state !== "inactive") {
					updateInteractionState({
						cursorFlags: 0,
						state: "inactive",
					});
				}
			} else if (
				interactionState.state !== "hover" ||
				!sameHoverHitAreas(interactionState.hitAreas, hitAreas)
			) {
				updateInteractionState({
					cursorFlags: 0,
					hitAreas,
					state: "hover",
				});
			}

			updateCursorStyle(event.currentTarget as Document);
			break;
		}
	}
}
