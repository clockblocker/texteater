import { getMountedSplits } from "../mutable-state/splits";
import { findMatchingHitAreas } from "../utils/findMatchingHitAreas";
import { getImperativeRegionMethods } from "../utils/getImperativeRegionMethods";

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
				const api = getImperativeRegionMethods({
					splitId: current.split.id,
					regionId: regionWithDefaultSize.id,
				});
				if (api && defaultSize !== undefined) {
					api.resize(defaultSize);

					event.preventDefault();
				}
			}
		}
	});
}
