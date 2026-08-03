import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { inflection } from "./builders";

export const orthographyCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adj-typo-freundlcih": {
			input: {
				markedContext:
					"Die Antwort klingt <TARGET>freundlcih</TARGET>.",
			},
			idealOutput: inflection({
				normalizedSurface: "freundlich",
				canonicalForm: "freundlich",
				inflectionalFeatures: {
					case: null,
					degree: "Pos",
					gender: null,
					number: null,
				},
				memberOrthographies: ["Typo"],
			}),
			explanation:
				"Repair the transposed letters without changing the contextual morphology.",
			contaminationKeys: ["de-adj-orthography:typo"],
		},
		"grammar-de-adj-typo-grsser": {
			input: {
				markedContext:
					"Ein <TARGET>grßer</TARGET> Hund wartet draußen.",
			},
			idealOutput: inflection({
				normalizedSurface: "großer",
				canonicalForm: "groß",
				inflectionalFeatures: {
					case: "Nom",
					degree: "Pos",
					gender: "Masc",
					number: "Sing",
				},
				memberOrthographies: ["Typo"],
			}),
			explanation:
				"Repair the missing o while preserving the attested German sharp-s spelling and contextual morphology.",
			contaminationKeys: ["de-adj-orthography:typo"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
