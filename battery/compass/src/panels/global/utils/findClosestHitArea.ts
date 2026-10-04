import type { Orientation } from "../../components/split/types";
import type { Point } from "../../types";
import type { HitArea } from "../dom/calculateHitAreas";
import { getDistanceBetweenPointAndRect } from "./getDistanceBetweenPointAndRect";

export function findClosestHitArea(
	orientation: Orientation,
	hitAreas: HitArea[],
	point: Point,
) {
	let closestHitArea: HitArea | undefined;
	let minDistance = {
		x: Infinity,
		y: Infinity,
	};

	for (const hitArea of hitAreas) {
		const data = getDistanceBetweenPointAndRect(point, hitArea.rect);
		switch (orientation) {
			case "horizontal": {
				if (data.x <= minDistance.x) {
					closestHitArea = hitArea;
					minDistance = data;
				}
				break;
			}
			case "vertical": {
				if (data.y <= minDistance.y) {
					closestHitArea = hitArea;
					minDistance = data;
				}
				break;
			}
		}
	}

	return closestHitArea
		? {
				distance: minDistance,
				hitArea: closestHitArea,
			}
		: undefined;
}
