import { isHTMLElement } from "../../utils/isHTMLElement";
import { compare } from "../../vendor/stacking-order";
import { doRectsIntersect } from "./doRectsIntersect";

// This library adds pointer event handlers to the Window for two reasons:
// 1. It allows detecting when the pointer is "near" to a region border or handle element,
//    (which can be particularly helpful on touch devices)
// 2. It allows detecting pointer interactions that apply to multiple, nearby regions/handles
//    (in the event of e.g. nested splits)
//
// Because events are handled at the Window, it's important to detect when another element is "above" a handle (e.g. a modal)
// as this should prevent the handle element from being clicked.
// This function does that determination.
export function isViableHitTarget({
	splitElement,
	hitArea,
	pointerEventTarget,
}: {
	splitElement: HTMLElement;
	hitArea: DOMRect;
	pointerEventTarget: EventTarget | null;
}) {
	if (
		!isHTMLElement(pointerEventTarget) ||
		pointerEventTarget.contains(splitElement) ||
		splitElement.contains(pointerEventTarget)
	) {
		// Calculating stacking order has a cost;
		// If either split or element contain the other, the click is safe and we can skip calculating the indices
		return true;
	}

	if (compare(pointerEventTarget, splitElement) > 0) {
		// If the pointer target is above the handle, check for overlap
		// If they are near each other, but not overlapping, then the handle is still a viable target
		//
		// Note that it's not sufficient to compare only the target
		// The target might be a small element inside of a larger container
		// (For example, a SPAN or a DIV inside of a larger modal dialog)
		let currentElement: HTMLElement | SVGElement | null =
			pointerEventTarget;
		while (currentElement) {
			if (currentElement.contains(splitElement)) {
				return true;
			} else if (
				doRectsIntersect(
					currentElement.getBoundingClientRect(),
					hitArea,
				)
			) {
				return false;
			}

			currentElement = currentElement.parentElement;
		}
	}

	return true;
}
