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
						surface: {
							normalizedSurface: "soll",
							spelling: "Canonical",
							realizationCoverage: "Full",
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
					"A lexical spelling error is repaired in normalizedSurface and marked Typo; the grammatical identity remains the modal auxiliary sollen.",
			},
			"grammar-de-aux-typo-mus": {
				input: {
					markedContext: "Er <TARGET>mus</TARGET> jetzt gehen.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Typo"],
						surface: {
							normalizedSurface: "muss",
							spelling: "Canonical",
							realizationCoverage: "Full",
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
						surface: {
							normalizedSurface: "wollen",
							spelling: "Canonical",
							realizationCoverage: "Full",
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
						surface: {
							normalizedSurface: "mag",
							spelling: "Canonical",
							realizationCoverage: "Full",
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
