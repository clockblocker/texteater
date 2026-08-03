import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const orthographyAndSurfaceCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-noun-demo-citation-hyphen-u-boot": {
				input: {
					markedContext: "Wörterbucheintrag: <TARGET>U-Boot</TARGET>",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						surface: {
							normalizedSurface: "U-Boot",
							spelling: "Canonical",
							realizationCoverage: "Full",
							surfaceKind: "Citation",
							surfaceFeatures: null,
						},
						lemma: {
							canonicalForm: "U-Boot",
							coreFeatures: { gender: "Neut", hyph: "Yes" },
						},
					},
				},
				explanation:
					"The entry label is Citation; its one TARGET pair yields one Standard member even though the Lemma contains a hyphen.",
			},
			"grammar-de-noun-demo-archaic-antlitz": {
				input: {
					markedContext:
						"Sie bewundert sein <TARGET>Antlitz</TARGET>.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						surface: {
							normalizedSurface: "Antlitz",
							spelling: "Canonical",
							realizationCoverage: "Full",
							surfaceKind: "Inflection",
							surfaceFeatures: { historicalStatus: "Archaic" },
							inflectionalFeatures: {
								case: "Acc",
								number: "Sing",
							},
						},
						lemma: {
							canonicalForm: "Antlitz",
							coreFeatures: { gender: "Neut", hyph: null },
						},
					},
				},
				explanation:
					"The identifiable archaic noun remains Resolved and marks the attested Surface Archaic.",
			},
			"grammar-de-noun-demo-lowercase-stadt": {
				input: {
					markedContext: "Sie besucht die <TARGET>stadt</TARGET>.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Typo"],
						surface: {
							normalizedSurface: "Stadt",
							spelling: "Canonical",
							realizationCoverage: "Full",
							surfaceKind: "Inflection",
							surfaceFeatures: null,
							inflectionalFeatures: {
								case: "Acc",
								number: "Sing",
							},
						},
						lemma: {
							canonicalForm: "Stadt",
							coreFeatures: { gender: "Fem", hyph: null },
						},
					},
				},
				explanation:
					"Incorrect lowercase spelling of a German common noun is a Typo; normalize only the casing and preserve the accusative sentence form.",
			},
			"grammar-de-noun-hyphenated-u-bahn": {
				input: {
					markedContext: "Sie nimmt die <TARGET>U-Bahn</TARGET>.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						surface: {
							normalizedSurface: "U-Bahn",
							spelling: "Canonical",
							realizationCoverage: "Full",
							surfaceKind: "Inflection",
							surfaceFeatures: null,
							inflectionalFeatures: {
								case: "Acc",
								number: "Sing",
							},
						},
						lemma: {
							canonicalForm: "U-Bahn",
							coreFeatures: { gender: "Fem", hyph: "Yes" },
						},
					},
				},
			},
			"grammar-de-noun-variant-photographie": {
				input: {
					markedContext:
						"Die <TARGET>Photographie</TARGET> hängt an der Wand.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						surface: {
							normalizedSurface: "Photographie",
							spelling: "Variant",
							realizationCoverage: "Full",
							surfaceKind: "Inflection",
							surfaceFeatures: null,
							inflectionalFeatures: {
								case: "Nom",
								number: "Sing",
							},
						},
						lemma: {
							canonicalForm: "Fotografie",
							coreFeatures: { gender: "Fem", hyph: null },
						},
					},
				},
			},
			"grammar-de-noun-typo-kaffe": {
				input: { markedContext: "Der <TARGET>Kaffe</TARGET> duftet." },
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Typo"],
						surface: {
							normalizedSurface: "Kaffee",
							spelling: "Canonical",
							realizationCoverage: "Full",
							surfaceKind: "Inflection",
							surfaceFeatures: null,
							inflectionalFeatures: {
								case: "Nom",
								number: "Sing",
							},
						},
						lemma: {
							canonicalForm: "Kaffee",
							coreFeatures: { gender: "Masc", hyph: null },
						},
					},
				},
			},
			"grammar-de-noun-casing-typo-katze": {
				input: {
					markedContext: "Sie streichelt die <TARGET>katze</TARGET>.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Typo"],
						surface: {
							normalizedSurface: "Katze",
							spelling: "Canonical",
							realizationCoverage: "Full",
							surfaceKind: "Inflection",
							surfaceFeatures: null,
							inflectionalFeatures: {
								case: "Acc",
								number: "Sing",
							},
						},
						lemma: {
							canonicalForm: "Katze",
							coreFeatures: { gender: "Fem", hyph: null },
						},
					},
				},
			},
			"grammar-de-noun-archaic-odem": {
				input: {
					markedContext:
						"Der <TARGET>Odem</TARGET> des Greises ging schwer.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						surface: {
							normalizedSurface: "Odem",
							spelling: "Canonical",
							realizationCoverage: "Full",
							surfaceKind: "Inflection",
							surfaceFeatures: { historicalStatus: "Archaic" },
							inflectionalFeatures: {
								case: "Nom",
								number: "Sing",
							},
						},
						lemma: {
							canonicalForm: "Odem",
							coreFeatures: { gender: "Masc", hyph: null },
						},
					},
				},
			},
			"grammar-de-noun-partial-coordinate-ellipse-kinderbuch": {
				input: {
					markedContext:
						"Sie verkauft <TARGET>Kinder</TARGET>- und Jugendbücher.",
				},
				idealOutput: {
					decision: "Resolved",
					resolution: {
						memberOrthographies: ["Standard"],
						surface: {
							normalizedSurface: "Kinder",
							spelling: "Canonical",
							realizationCoverage: "Partial",
							surfaceKind: "Inflection",
							surfaceFeatures: null,
							inflectionalFeatures: {
								case: "Acc",
								number: "Plur",
							},
						},
						lemma: {
							canonicalForm: "Kinderbuch",
							coreFeatures: { gender: "Neut", hyph: null },
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
