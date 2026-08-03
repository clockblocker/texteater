import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation } from "./builders";

export const surfaceKindCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adj-citation-sanft": {
			input: {
				markedContext: "Wörterbucheintrag: <TARGET>sanft</TARGET>",
			},
			idealOutput: citation({
				normalizedSurface: "sanft",
				canonicalForm: "sanft",
			}),
			explanation:
				"An explicit dictionary label is Citation and carries no Inflectional Features.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
