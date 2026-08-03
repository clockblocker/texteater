import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const core = (options: {
	readonly adpType: "Circ" | "Post" | "Prep" | null;
	readonly governedCase: "Acc" | "Dat" | "Gen" | null;
	readonly abbr?: "Yes" | null;
}) => ({
	abbr: options.abbr ?? null,
	adpType: options.adpType,
	extPos: null,
	foreign: null,
	governedCase: options.governedCase,
	partType: null,
});

export const orthographyAndSurfaceCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-adp-demo-sentence-initial-wegen": {
				input: {
					markedContext:
						"<TARGET>Wegen</TARGET> des Sturms blieb die Fähre im Hafen.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						surface: {
							normalizedSurface: "wegen",
							spelling: "Canonical",
							realizationCoverage: "Full",
							surfaceKind: "Citation",
							surfaceFeatures: null,
						},
						lemma: {
							canonicalForm: "wegen",
							coreFeatures: core({
								adpType: "Prep",
								governedCase: "Gen",
							}),
						},
					},
				},
				explanation:
					"Ordinary sentence-initial capitalization is Standard, while normalizedSurface and canonicalForm use lowercase.",
			},
			"grammar-de-adp-demo-typo-one": {
				input: {
					markedContext:
						"Sie ging <TARGET>one</TARGET> Mantel hinaus.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Typo"],
						surface: {
							normalizedSurface: "ohne",
							spelling: "Canonical",
							realizationCoverage: "Full",
							surfaceKind: "Citation",
							surfaceFeatures: null,
						},
						lemma: {
							canonicalForm: "ohne",
							coreFeatures: core({
								adpType: "Prep",
								governedCase: "Acc",
							}),
						},
					},
				},
				explanation:
					"The missing h is a real typo; repair it without changing the adposition identity.",
			},
			"grammar-de-adp-citation-label-jenseits": {
				input: {
					markedContext:
						"Wörterbucheintrag: <TARGET>jenseits</TARGET>",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						surface: {
							normalizedSurface: "jenseits",
							spelling: "Canonical",
							realizationCoverage: "Full",
							surfaceKind: "Citation",
							surfaceFeatures: null,
						},
						lemma: {
							canonicalForm: "jenseits",
							coreFeatures: core({
								adpType: "Prep",
								governedCase: "Gen",
							}),
						},
					},
				},
			},
			"grammar-de-adp-mid-sentence-casing-typo-unter": {
				input: {
					markedContext:
						"Das liegt <TARGET>Unter</TARGET> dem Tisch.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Typo"],
						surface: {
							normalizedSurface: "unter",
							spelling: "Canonical",
							realizationCoverage: "Full",
							surfaceKind: "Citation",
							surfaceFeatures: null,
						},
						lemma: {
							canonicalForm: "unter",
							coreFeatures: core({
								adpType: "Prep",
								governedCase: null,
							}),
						},
					},
				},
			},
			"grammar-de-adp-lexical-typo-gegen": {
				input: {
					markedContext:
						"Sie protestiert <TARGET>egen</TARGET> den Plan.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Typo"],
						surface: {
							normalizedSurface: "gegen",
							spelling: "Canonical",
							realizationCoverage: "Full",
							surfaceKind: "Citation",
							surfaceFeatures: null,
						},
						lemma: {
							canonicalForm: "gegen",
							coreFeatures: core({
								adpType: "Prep",
								governedCase: "Acc",
							}),
						},
					},
				},
			},
			"grammar-de-adp-archaic-ob": {
				input: {
					markedContext:
						"<TARGET>Ob</TARGET> des Unwetters blieb das Tor geschlossen.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						surface: {
							normalizedSurface: "ob",
							spelling: "Canonical",
							realizationCoverage: "Full",
							surfaceKind: "Citation",
							surfaceFeatures: {
								historicalStatus: "Archaic",
							},
						},
						lemma: {
							canonicalForm: "ob",
							coreFeatures: core({
								adpType: "Prep",
								governedCase: "Gen",
							}),
						},
					},
				},
			},
			"grammar-de-adp-repeated-second-bei": {
				input: {
					markedContext:
						"Bei Anna war er schon, nun ist er <TARGET>bei</TARGET> Ben.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						surface: {
							normalizedSurface: "bei",
							spelling: "Canonical",
							realizationCoverage: "Full",
							surfaceKind: "Citation",
							surfaceFeatures: null,
						},
						lemma: {
							canonicalForm: "bei",
							coreFeatures: core({
								adpType: "Prep",
								governedCase: "Dat",
							}),
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
