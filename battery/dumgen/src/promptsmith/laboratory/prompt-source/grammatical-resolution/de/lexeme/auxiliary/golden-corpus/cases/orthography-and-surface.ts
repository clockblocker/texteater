import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const finiteFeatures = {
	mood: "Ind" as const,
	number: "Sing" as const,
	person: "3" as const,
	tense: "Pres" as const,
	verbForm: "Fin" as const,
	voice: null,
};

export const orthographyAndSurfaceCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-aux-demo-typo-sol": {
				input: {
					markedContext: "Er <TARGET>sol</TARGET> jetzt gehen.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Typo"],
						realizationCoverage: "Full",
						normalizedMembers: ["soll"],
						surface: {
							spelling: "Canonical",
							surfaceKind: "Inflection",
							surfaceFeatures: null,
							inflectionalFeatures: finiteFeatures,
						},
						lemma: {
							canonicalForm: "sollen",
							coreFeatures: { verbType: "Mod" },
						},
					},
				},
				explanation:
					"A lexical spelling error is repaired in normalizedMembers and marked Typo; the grammatical identity remains the modal auxiliary sollen.",
			},
			"grammar-de-aux-typo-mus": {
				input: {
					markedContext: "Er <TARGET>mus</TARGET> jetzt gehen.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Typo"],
						realizationCoverage: "Full",
						normalizedMembers: ["muss"],
						surface: {
							spelling: "Canonical",
							surfaceKind: "Inflection",
							surfaceFeatures: null,
							inflectionalFeatures: finiteFeatures,
						},
						lemma: {
							canonicalForm: "müssen",
							coreFeatures: { verbType: "Mod" },
						},
					},
				},
			},
			"grammar-de-aux-sentence-initial-wollen": {
				input: {
					markedContext: "<TARGET>Wollen</TARGET> wir anfangen?",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						realizationCoverage: "Full",
						normalizedMembers: ["wollen"],
						surface: {
							spelling: "Canonical",
							surfaceKind: "Inflection",
							surfaceFeatures: null,
							inflectionalFeatures: {
								...finiteFeatures,
								number: "Plur",
								person: "1",
							},
						},
						lemma: {
							canonicalForm: "wollen",
							coreFeatures: { verbType: "Mod" },
						},
					},
				},
			},
			"grammar-de-aux-repeated-second-mag": {
				input: {
					markedContext:
						"Er mag bleiben, aber sie <TARGET>mag</TARGET> lieber gehen.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						realizationCoverage: "Full",
						normalizedMembers: ["mag"],
						surface: {
							spelling: "Canonical",
							surfaceKind: "Inflection",
							surfaceFeatures: null,
							inflectionalFeatures: finiteFeatures,
						},
						lemma: {
							canonicalForm: "mögen",
							coreFeatures: { verbType: "Mod" },
						},
					},
				},
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
