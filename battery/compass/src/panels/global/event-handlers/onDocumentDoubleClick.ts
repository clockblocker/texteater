import { getMountedSplits } from "../mutable-state/splits";
import { findMatchingHitAreas } from "../utils/findMatchingHitAreas";
import { resizeRegion } from "../utils/resizeRegion";

export function onDocumentDoubleClick(event: MouseEvent) {
	if (event.defaultPrevented) {
		return;
	}

	const mountedSplits = getMountedSplits();
	const hitAreas = findMatchingHitAreas(event, mountedSplits);
	hitAreas.forEach((current) => {
		if (current.handle && !current.handle.disableDoubleClick) {
			const regionWithDefaultSize = current.regions.find(
				(region) => region.regionConstraints.defaultSize !== undefined,
			);
			if (regionWithDefaultSize) {
				const defaultSize =
					regionWithDefaultSize.regionConstraints.defaultSize;
				if (defaultSize !== undefined) {
					resizeRegion(
						current.split.id,
						regionWithDefaultSize.id,
						defaultSize,
					);

					event.preventDefault();
				}
			}
		}
	});
}
