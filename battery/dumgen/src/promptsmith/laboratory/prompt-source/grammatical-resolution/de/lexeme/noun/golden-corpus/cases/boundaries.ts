import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-noun-demo-unresolved-adjective-route": {
			input: {
				markedContext: "Der Zug ist <TARGET>schnell</TARGET>.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"The marked material is an adjective, so the fixed Lexeme/NOUN route must remain Unresolved.",
		},
		"grammar-de-noun-demo-unresolved-ambiguous-see": {
			input: {
				markedContext: "Stichwort ohne Kontext: <TARGET>See</TARGET>",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"Without context, masculine See 'lake' and feminine See 'sea' do not determine one grammatical noun identity.",
		},
		"grammar-de-noun-demo-unresolved-overbroad-rathaus": {
			input: {
				markedContext:
					"Sie fotografiert das <TARGET>alte Rathaus</TARGET>.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"The TARGET includes the adjective alte, which is not lexical material of the noun Rathaus.",
		},
		"grammar-de-noun-repeated-token-second-bank": {
			input: {
				markedContext:
					"Die Bank steht neben der <TARGET>Bank</TARGET>.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["Bank"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: { case: "Dat", number: "Sing" },
					},
					lemma: {
						canonicalForm: "Bank",
						coreFeatures: { gender: "Fem", hyph: null },
					},
				},
			},
		},
		"grammar-de-noun-unresolved-verb-route": {
			input: { markedContext: "Sie <TARGET>laufen</TARGET> schnell." },
			idealOutput: { decision: "Unresolved", resolution: null },
		},
		"grammar-de-noun-unresolved-ambiguous-leiter": {
			input: {
				markedContext:
					"Stichwort ohne Kontext: <TARGET>Leiter</TARGET>",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
		},
		"grammar-de-noun-unresolved-overbroad-phrase": {
			input: {
				markedContext: "Sie sieht das <TARGET>rote Haus</TARGET>.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
		},
		"grammar-de-noun-unresolved-two-unrelated-targets": {
			input: {
				markedContext:
					"Die <TARGET>Bank</TARGET> steht neben der <TARGET>Kirche</TARGET>.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
