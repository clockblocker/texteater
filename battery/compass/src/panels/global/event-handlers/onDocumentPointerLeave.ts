import { getInteractionState } from "../mutable-state/interactions";
import { getMountedSplits } from "../mutable-state/splits";
import { updateActiveHitAreas } from "../utils/updateActiveHitArea";

export function onDocumentPointerLeave(event: PointerEvent) {
	const mountedSplits = getMountedSplits();
	const interactionState = getInteractionState();

	switch (interactionState.state) {
		case "active": {
			updateActiveHitAreas({
				document: event.currentTarget as Document,
				event,
				hitAreas: interactionState.hitAreas,
				initialLayoutMap: interactionState.initialLayoutMap,
				mountedSplits,
				prevCursorFlags: interactionState.cursorFlags,
			});
		}
	}
}
