import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

/**
 * Route and membership failures belong to Target Classification or canonical
 * input alignment. This total post-classification leaf retains no negatives.
 */
export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
