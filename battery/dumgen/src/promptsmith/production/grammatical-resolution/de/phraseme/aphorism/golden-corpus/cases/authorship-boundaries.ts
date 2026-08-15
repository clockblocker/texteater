import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

// Author attribution is unmarked context under the canonical classified-target
// contract, never a model-facing rejection case.
export const authorshipBoundaryCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
