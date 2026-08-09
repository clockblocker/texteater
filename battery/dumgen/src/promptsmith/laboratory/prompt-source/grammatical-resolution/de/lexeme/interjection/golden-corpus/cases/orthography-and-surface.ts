import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const orthographyAndSurfaceCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-intj-demo-hmm-variant": {
				input: {
					markedContext: "Sie überlegte: <TARGET>hmm</TARGET>.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						realizationCoverage: "Full",
						normalizedMembers: ["hmm"],
						surface: {
							spelling: "Variant",
							surfaceKind: "Citation",
							surfaceFeatures: null,
						},
						lemma: {
							canonicalForm: "hm",
							coreFeatures: { partType: null },
						},
					},
				},
				explanation:
					"Expressive lengthening is a licensed written Variant, not a spelling error and not a Partial realization.",
			},
			"grammar-de-intj-sentence-initial-ach": {
				input: {
					markedContext: "<TARGET>Ach</TARGET>, das ist schade.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						realizationCoverage: "Full",
						normalizedMembers: ["ach"],
						surface: {
							spelling: "Canonical",
							surfaceKind: "Citation",
							surfaceFeatures: null,
						},
						lemma: {
							canonicalForm: "ach",
							coreFeatures: { partType: null },
						},
					},
				},
			},
			"grammar-de-intj-typo-huraa": {
				input: { markedContext: "Alle riefen <TARGET>huraa</TARGET>." },
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Typo"],
						realizationCoverage: "Full",
						normalizedMembers: ["hurra"],
						surface: {
							spelling: "Canonical",
							surfaceKind: "Citation",
							surfaceFeatures: null,
						},
						lemma: {
							canonicalForm: "hurra",
							coreFeatures: { partType: null },
						},
					},
				},
			},
			"grammar-de-intj-archaic-juchhei": {
				input: {
					markedContext:
						"Veralteter Ausruf: <TARGET>juchhei</TARGET>",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						realizationCoverage: "Full",
						normalizedMembers: ["juchhei"],
						surface: {
							spelling: "Canonical",
							surfaceKind: "Citation",
							surfaceFeatures: {
								historicalStatus: "Archaic",
							},
						},
						lemma: {
							canonicalForm: "juchhei",
							coreFeatures: { partType: null },
						},
					},
				},
				explanation:
					"Corpus-only taxonomy probe: juchhei is veraltend, but mapping that label to the schema's stronger Archaic Surface status requires human confirmation before scoring.",
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
