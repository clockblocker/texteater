import { updateCursorStyle } from "../cursor/updateCursorStyle.ts";
import {
	getInteractionState,
	updateInteractionState,
} from "../mutable-state/interactions.ts";
import {
	getMountedSplitState,
	getMountedSplits,
	updateMountedSplit,
} from "../mutable-state/splits.ts";

export function completeActivePointerResize(document: Document) {
	const interactionState = getInteractionState();
	const mountedSplits = getMountedSplits();

	let match = false;

	switch (interactionState.state) {
		case "active": {
			updateInteractionState({
				cursorFlags: 0,
				state: "inactive",
			});

			if (interactionState.hitAreas.length > 0) {
				updateCursorStyle(document);

				match = true;

				// Dispatch one more "change" event after the interaction state has been reset.
				// Splits use this as a signal to call onLayoutChanged.
				// This is the canonical user-pointer-up site, so flag the dispatch with
				// isUserInteraction: true. See #716.
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
			}
		}
	}

	return match;
}
