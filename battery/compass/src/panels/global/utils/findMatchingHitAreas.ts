import { calculateHitAreas, type HitArea } from "../dom/calculateHitAreas";
import type { MountedSplits } from "../mutable-state/splits";
import { findClosestHitArea } from "./findClosestHitArea";
import { isViableHitTarget } from "./isViableHitTarget";

export function findMatchingHitAreas(
	event: {
		clientX: number;
		clientY: number;
		target: EventTarget | null;
	},
	mountedSplits: MountedSplits,
): HitArea[] {
	const matchingHitAreas: HitArea[] = [];

	mountedSplits.forEach((_, splitData) => {
		if (splitData.disabled) {
			return;
		}

		const hitAreas = calculateHitAreas(splitData);
		const match = findClosestHitArea(splitData.orientation, hitAreas, {
			x: event.clientX,
			y: event.clientY,
		});
		if (
			match &&
			match.distance.x <= 0 &&
			match.distance.y <= 0 &&
			isViableHitTarget({
				splitElement: splitData.element,
				hitArea: match.hitArea.rect,
				pointerEventTarget: event.target,
			})
		) {
			matchingHitAreas.push(match.hitArea);
		}
	});

	return matchingHitAreas;
}
