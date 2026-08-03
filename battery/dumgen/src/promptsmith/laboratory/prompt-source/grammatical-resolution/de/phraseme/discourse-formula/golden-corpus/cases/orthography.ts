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
		"grammar-de-discourse-formula-provisional-guten-morgen-all-caps": {
			input: {
				markedContext:
					"Im Chat schrieb sie: „<TARGET>GUTEN</TARGET> <TARGET>Morgen</TARGET>!“",
			},
			idealOutput: citation({
				normalizedSurface: "guten Morgen",
				canonicalForm: "guten morgen",
				role: "Greeting",
				memberOrthographies: ["Typo", "Standard"],
			}),
			contaminationKeys: [
				"de-discourse-formula:orthography-guten-morgen",
			],
			explanation:
				"Corpus-only casing probe: emphatic all-caps versus inappropriate casing needs an explicit cross-route product policy; the provisional oracle treats it as Typo.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
