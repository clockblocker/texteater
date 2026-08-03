import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { inflection } from "./builders";

export const comparisonCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adj-irregular-comparative-besser": {
			input: {
				markedContext: "Der zweite Plan ist <TARGET>besser</TARGET>.",
			},
			idealOutput: inflection({
				normalizedSurface: "besser",
				canonicalForm: "gut",
				inflectionalFeatures: {
					case: null,
					degree: "Cmp",
					gender: null,
					number: null,
				},
			}),
			explanation:
				"The suppletive comparative Surface belongs to the positive Lemma gut.",
		},
		"grammar-de-adj-attributive-comparative-teuer": {
			input: {
				markedContext: "Er kaufte ein <TARGET>teureres</TARGET> Gerät.",
			},
			idealOutput: inflection({
				normalizedSurface: "teureres",
				canonicalForm: "teuer",
				inflectionalFeatures: {
					case: "Acc",
					degree: "Cmp",
					gender: "Neut",
					number: "Sing",
				},
			}),
		},
		"grammar-de-adj-attributive-superlative-hoch": {
			input: {
				markedContext:
					"Der <TARGET>höchste</TARGET> Turm steht am Fluss.",
			},
			idealOutput: inflection({
				normalizedSurface: "höchste",
				canonicalForm: "hoch",
				inflectionalFeatures: {
					case: "Nom",
					degree: "Sup",
					gender: "Masc",
					number: "Sing",
				},
			}),
		},
		"grammar-de-adj-adverbial-superlative-sorgfaeltig": {
			input: {
				markedContext:
					"Sie arbeitet am <TARGET>sorgfältigsten</TARGET>.",
			},
			idealOutput: inflection({
				normalizedSurface: "sorgfältigsten",
				canonicalForm: "sorgfältig",
				inflectionalFeatures: {
					case: null,
					degree: "Sup",
					gender: null,
					number: null,
				},
			}),
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
