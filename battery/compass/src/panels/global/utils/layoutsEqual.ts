import type { Layout } from "../../components/group/types";
import { compareLayoutNumbers } from "./compareLayoutNumbers";

export function layoutsEqual(a: Layout, b: Layout): boolean {
	if (Object.keys(a).length !== Object.keys(b).length) {
		return false;
	}

	for (const [id, size] of Object.entries(a)) {
		// Edge case: Panel id has been changed
		const otherSize = b[id];
		if (
			otherSize === undefined ||
			compareLayoutNumbers(size, otherSize) !== 0
		) {
			return false;
		}
	}

	return true;
}
