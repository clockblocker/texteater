import type { RegisteredRegion } from "../../components/region/types";
import type { Layout } from "../../components/split/types";

export function validateLayoutKeys(
	regions: RegisteredRegion[],
	layout: Layout,
) {
	const regionIds = regions.map((region) => region.id);
	const layoutKeys = Object.keys(layout);

	if (regionIds.length !== layoutKeys.length) {
		return false;
	}

	for (const regionId of regionIds) {
		if (!layoutKeys.includes(regionId)) {
			return false;
		}
	}

	return true;
}
