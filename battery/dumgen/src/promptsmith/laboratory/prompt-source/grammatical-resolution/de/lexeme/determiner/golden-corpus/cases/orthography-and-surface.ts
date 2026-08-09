import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const nullCore = {
	definite: null,
	extPos: null,
	foreign: null,
	numType: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
} as const;

const nullInflection = {
	case: null,
	degree: null,
	gender: null,
	"gender[psor]": null,
	number: null,
	"number[psor]": null,
} as const;

export const orthographyAndSurfaceCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-det-citation-jeglicher": {
				input: {
					markedContext:
						"Wörterbucheintrag: <TARGET>jeglicher</TARGET>",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						realizationCoverage: "Full",
						normalizedMembers: ["jeglicher"],
						surface: {
							spelling: "Canonical",
							surfaceKind: "Citation",
							surfaceFeatures: null,
						},
						lemma: {
							canonicalForm: "jeglicher",
							coreFeatures: { ...nullCore, pronType: "Ind" },
						},
					},
				},
			},
			"grammar-de-det-typo-keien": {
				input: {
					markedContext: "Wir haben <TARGET>keien</TARGET> Plan.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Typo"],
						realizationCoverage: "Full",
						normalizedMembers: ["keinen"],
						surface: {
							spelling: "Canonical",
							surfaceKind: "Inflection",
							surfaceFeatures: null,
							inflectionalFeatures: {
								...nullInflection,
								case: "Acc",
								gender: "Masc",
								number: "Sing",
							},
						},
						lemma: {
							canonicalForm: "kein",
							coreFeatures: { ...nullCore, pronType: "Neg" },
						},
					},
				},
				explanation:
					"Repair the missing n to the contextual accusative form keinen; do not lemmatize normalizedMembers.",
			},
			"grammar-de-det-repeated-second-einem": {
				input: {
					markedContext:
						"Ein Kind spielt; später helfe ich <TARGET>einem</TARGET> Kind.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						realizationCoverage: "Full",
						normalizedMembers: ["einem"],
						surface: {
							spelling: "Canonical",
							surfaceKind: "Inflection",
							surfaceFeatures: null,
							inflectionalFeatures: {
								...nullInflection,
								case: "Dat",
								gender: "Neut",
								number: "Sing",
							},
						},
						lemma: {
							canonicalForm: "ein",
							coreFeatures: {
								...nullCore,
								definite: "Ind",
								numType: "Card",
								pronType: "Art",
							},
						},
					},
				},
				explanation:
					"The marked occurrence is dative neuter singular; the earlier unmarked form must not overwrite its local agreement.",
			},
			"grammar-de-det-provisional-feminine-die": {
				input: { markedContext: "Ich sehe <TARGET>die</TARGET> Frau." },
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						realizationCoverage: "Full",
						normalizedMembers: ["die"],
						surface: {
							spelling: "Canonical",
							surfaceKind: "Inflection",
							surfaceFeatures: null,
							inflectionalFeatures: {
								...nullInflection,
								case: "Acc",
								number: "Sing",
							},
						},
						lemma: {
							canonicalForm: "der",
							coreFeatures: {
								...nullCore,
								definite: "Def",
								pronType: "Art",
							},
						},
					},
				},
				explanation:
					"Provisional domain limitation: the exact DET codec excludes Fem from agreement gender, so the attested feminine gender is currently represented as null.",
			},
			"grammar-de-det-provisional-uninflected-derlei": {
				input: {
					markedContext:
						"<TARGET>Derlei</TARGET> Vorfälle sind selten.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						realizationCoverage: "Full",
						normalizedMembers: ["derlei"],
						surface: {
							spelling: "Canonical",
							surfaceKind: "Citation",
							surfaceFeatures: null,
						},
						lemma: {
							canonicalForm: "derlei",
							coreFeatures: { ...nullCore, pronType: "Dem" },
						},
					},
				},
				explanation:
					"Provisional Surface policy: the codec requires non-empty inflectional features, so an uninflected contextual DET is represented as Citation pending review.",
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
