import { createGermanOperations } from "../concrete-lang/de/production.js";
import type { Dumgen, DumgenOptions } from "../types.js";
import { createSegmentation, createTrustedSegmentation } from "./segment.js";
import { requestBudget } from "./trace.js";
/**
 * Six composable operations. Dictionaries and persistence belong to the
 * caller. All of an instance's operations share one request budget.
 */
export function createDumgen(options: DumgenOptions): Dumgen {
	const budget = requestBudget(options);
	return {
		segment: createSegmentation(options, budget),
		segmentSentence: createTrustedSegmentation(options, budget),
		...createGermanOperations(options, budget),
	};
}
