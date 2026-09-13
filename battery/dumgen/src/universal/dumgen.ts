import { createGermanOperations } from "../concrete-lang/de/production.js";
import type { Dumgen, DumgenOptions } from "../types.js";
import { createSegmentation } from "./segment.js";
/** Six composable operations. Dictionaries and persistence belong to the caller. */
export function createDumgen(options: DumgenOptions): Dumgen {
	return {
		segment: createSegmentation(options),
		...createGermanOperations(options),
	};
}
