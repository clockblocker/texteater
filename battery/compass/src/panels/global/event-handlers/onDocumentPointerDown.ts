import type { Layout, RegisteredSplit } from "../../components/split/types";
import { updateInteractionState } from "../mutable-state/interactions";
import { getMountedSplits } from "../mutable-state/splits";
import { findMatchingHitAreas } from "../utils/findMatchingHitAreas";

export function onDocumentPointerDown(event: PointerEvent) {
	if (event.defaultPrevented) {
		return;
	} else if (event.pointerType === "mouse" && event.button > 0) {
		return;
	}

	const mountedSplits = getMountedSplits();

	const hitAreas = findMatchingHitAreas(event, mountedSplits);

	const initialLayoutMap = new Map<RegisteredSplit, Layout>();

	let didChangeFocus = false;

	hitAreas.forEach((current) => {
		if (current.handle) {
			if (!didChangeFocus) {
				didChangeFocus = true;

				current.handle.element.focus({
					focusVisible: false,
					preventScroll: true,
				});

				// TRICKY
				// Calling setPointerCapture() here would help with detecting pointer "pointermove"/"pointerup" events that happen over iframes
				// but it would also prevent "click" events from firing if the use releases without actually dragging
				// Because of this, it's safer to wait until the first "pointermove" event to set capture
			}
		}

		const match = mountedSplits.get(current.split);
		if (match) {
			initialLayoutMap.set(current.split, match.layout);
		}
	});

	updateInteractionState({
		cursorFlags: 0,
		hitAreas,
		initialLayoutMap,
		pointerDownAtPoint: { x: event.clientX, y: event.clientY },
		state: "active",
	});

	if (hitAreas.length) {
		event.preventDefault();
	}
}
