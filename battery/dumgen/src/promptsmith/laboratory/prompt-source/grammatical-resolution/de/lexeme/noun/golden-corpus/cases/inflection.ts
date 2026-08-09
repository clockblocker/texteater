import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const inflectionCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-noun-citation-haus": {
			input: {
				markedContext: "Wörterbucheintrag: <TARGET>Haus</TARGET>",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "Haus",
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "Haus",
						coreFeatures: { gender: "Neut", hyph: null },
					},
				},
			},
		},
		"grammar-de-noun-inflection-dat-sing-bibliothek": {
			input: {
				markedContext: "Wir sitzen in der <TARGET>Bibliothek</TARGET>.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "Bibliothek",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: { case: "Dat", number: "Sing" },
					},
					lemma: {
						canonicalForm: "Bibliothek",
						coreFeatures: { gender: "Fem", hyph: null },
					},
				},
			},
		},
		"grammar-de-noun-inflection-nom-plur-banken": {
			input: {
				markedContext: "Die <TARGET>Banken</TARGET> sind geöffnet.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "Banken",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: { case: "Nom", number: "Plur" },
					},
					lemma: {
						canonicalForm: "Bank",
						coreFeatures: { gender: "Fem", hyph: null },
					},
				},
			},
		},
		"grammar-de-noun-inflection-acc-sing-hund": {
			input: { markedContext: "Sie sieht den <TARGET>Hund</TARGET>." },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "Hund",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: { case: "Acc", number: "Sing" },
					},
					lemma: {
						canonicalForm: "Hund",
						coreFeatures: { gender: "Masc", hyph: null },
					},
				},
			},
		},
		"grammar-de-noun-inflection-acc-plur-buecher": {
			input: { markedContext: "Sie kauft die <TARGET>Bücher</TARGET>." },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "Bücher",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: { case: "Acc", number: "Plur" },
					},
					lemma: {
						canonicalForm: "Buch",
						coreFeatures: { gender: "Neut", hyph: null },
					},
				},
			},
		},
		"grammar-de-noun-inflection-dat-plur-kindern": {
			input: { markedContext: "Er hilft den <TARGET>Kindern</TARGET>." },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "Kindern",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: { case: "Dat", number: "Plur" },
					},
					lemma: {
						canonicalForm: "Kind",
						coreFeatures: { gender: "Neut", hyph: null },
					},
				},
			},
		},
		"grammar-de-noun-inflection-gen-sing-mannes": {
			input: {
				markedContext:
					"Das Fahrrad des <TARGET>Mannes</TARGET> ist neu.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "Mannes",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: { case: "Gen", number: "Sing" },
					},
					lemma: {
						canonicalForm: "Mann",
						coreFeatures: { gender: "Masc", hyph: null },
					},
				},
			},
		},
		"grammar-de-noun-inflection-gen-plur-frauen": {
			input: {
				markedContext:
					"Die Stimmen der <TARGET>Frauen</TARGET> waren deutlich.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "Frauen",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: { case: "Gen", number: "Plur" },
					},
					lemma: {
						canonicalForm: "Frau",
						coreFeatures: { gender: "Fem", hyph: null },
					},
				},
			},
		},
		"grammar-de-noun-vocative-leute-unmarked-case": {
			input: { markedContext: "Hallo, <TARGET>Leute</TARGET>!" },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "Leute",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: { case: null, number: "Plur" },
					},
					lemma: {
						canonicalForm: "Leute",
						coreFeatures: { gender: null, hyph: null },
					},
				},
			},
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
