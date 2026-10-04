import type { RegionConstraints } from "../../components/region/types";
import { objectsEqual } from "./objectsEqual";

export function regionConstraintsEqual(
	a: RegionConstraints[],
	b: RegionConstraints[],
) {
	if (a.length !== b.length) {
		return false;
	}

	return a.every((current, index) => {
		const other = b[index];
		return other !== undefined && objectsEqual(current, other);
	});
}
