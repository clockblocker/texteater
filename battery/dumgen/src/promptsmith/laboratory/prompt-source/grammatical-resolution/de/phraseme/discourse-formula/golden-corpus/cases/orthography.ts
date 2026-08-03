import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation } from "./builders";

export const orthographyCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-discourse-formula-herzlich-wilkommen-typo": {
			input: {
				markedContext:
					"Die Gastgeberin begrüßte ihn: „<TARGET>Herzlich</TARGET> <TARGET>wilkommen</TARGET>!“",
			},
			idealOutput: citation({
				normalizedSurface: "herzlich willkommen",
				canonicalForm: "herzlich willkommen",
				role: "Greeting",
				memberOrthographies: ["Standard", "Typo"],
			}),
			explanation:
				"The missing second l is repaired and attributed only to the second marked member; ordinary utterance-initial capitalization remains Standard.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
