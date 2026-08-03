import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation } from "./builders";

export const orthographyCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-num-typo-dreii": {
			input: {
				markedContext: "Sie braucht <TARGET>dreii</TARGET> Umschläge.",
			},
			idealOutput: citation({
				normalizedSurface: "drei",
				canonicalForm: "drei",
				memberOrthography: "Typo",
			}),
			explanation:
				"Repair the duplicated final i in both normalizedSurface and canonicalForm and classify the attested member as Typo.",
			contaminationKeys: ["de-num-orthography:word-cardinal-typo"],
		},
		"grammar-de-num-sentence-initial-fuenf": {
			input: {
				markedContext: "<TARGET>Fünf</TARGET> Gäste sind schon da.",
			},
			idealOutput: citation({ normalizedSurface: "fünf" }),
			explanation:
				"Ordinary sentence-initial capitalization is Standard while normalizedSurface and canonicalForm use lowercase.",
			contaminationKeys: ["de-num-orthography:sentence-initial"],
		},
		"grammar-de-num-typo-siebn": {
			input: {
				markedContext: "Es fehlen <TARGET>siebn</TARGET> Seiten.",
			},
			idealOutput: citation({
				normalizedSurface: "sieben",
				canonicalForm: "sieben",
				memberOrthography: "Typo",
			}),
			contaminationKeys: ["de-num-orthography:word-cardinal-typo"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
