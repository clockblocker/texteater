import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const nullPeripheralFeatures = {
	abbr: null,
	extPos: null,
	foreign: null,
	partType: null,
} as const;

export const coreFeatureCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adp-demo-contextual-mit-citation": {
			input: {
				markedContext: "Sie fährt <TARGET>mit</TARGET> dem Bus.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "mit",
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "mit",
						coreFeatures: {
							...nullPeripheralFeatures,
							adpType: "Prep",
							governedCase: "Dat",
						},
					},
				},
			},
			explanation:
				"A contextual non-inflecting ADP still has a Citation Surface; dative government is a stable Lemma feature.",
		},
		"grammar-de-adp-demo-two-way-auf": {
			input: {
				markedContext: "Das Buch liegt <TARGET>auf</TARGET> dem Tisch.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "auf",
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "auf",
						coreFeatures: {
							...nullPeripheralFeatures,
							adpType: "Prep",
							governedCase: null,
						},
					},
				},
			},
			explanation:
				"The local complement is dative, but two-way auf has no single lexically governed case in the current model.",
		},
		"grammar-de-adp-demo-postposition-entlang": {
			input: {
				markedContext: "Wir liefen den Fluss <TARGET>entlang</TARGET>.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "entlang",
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "entlang",
						coreFeatures: {
							...nullPeripheralFeatures,
							adpType: "Post",
							governedCase: "Acc",
						},
					},
				},
			},
			explanation:
				"Following its accusative complement establishes the postpositional entlang identity.",
		},
		"grammar-de-adp-preposition-durch-acc": {
			input: {
				markedContext: "Wir gehen <TARGET>durch</TARGET> den Park.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "durch",
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "durch",
						coreFeatures: {
							...nullPeripheralFeatures,
							adpType: "Prep",
							governedCase: "Acc",
						},
					},
				},
			},
		},
		"grammar-de-adp-preposition-zu-dat": {
			input: {
				markedContext: "Sie geht <TARGET>zu</TARGET> ihrer Ärztin.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "zu",
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "zu",
						coreFeatures: {
							...nullPeripheralFeatures,
							adpType: "Prep",
							governedCase: "Dat",
						},
					},
				},
			},
		},
		"grammar-de-adp-provisional-wegen-dative-governs-genitive": {
			input: {
				markedContext:
					"Wir blieben <TARGET>wegen</TARGET> dem Regen zu Hause.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "wegen",
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "wegen",
						coreFeatures: {
							...nullPeripheralFeatures,
							adpType: "Prep",
							governedCase: "Gen",
						},
					},
				},
			},
			explanation:
				"Provisional policy case: whether colloquial dative wegen retains canonical genitive government needs human confirmation.",
		},
		"grammar-de-adp-two-way-vor-acc": {
			input: {
				markedContext:
					"Er stellt die Kiste <TARGET>vor</TARGET> die Tür.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "vor",
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "vor",
						coreFeatures: {
							...nullPeripheralFeatures,
							adpType: "Prep",
							governedCase: null,
						},
					},
				},
			},
		},
		"grammar-de-adp-abbreviation-inkl": {
			input: {
				markedContext:
					"Preis <TARGET>inkl.</TARGET> Versand: zehn Euro.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "inkl.",
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "inkl.",
						coreFeatures: {
							...nullPeripheralFeatures,
							abbr: "Yes",
							adpType: "Prep",
							governedCase: "Gen",
						},
					},
				},
			},
		},
		"grammar-de-adp-postposition-zuliebe-dat": {
			input: {
				markedContext:
					"Den Kindern <TARGET>zuliebe</TARGET> blieb sie noch.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "zuliebe",
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "zuliebe",
						coreFeatures: {
							...nullPeripheralFeatures,
							adpType: "Post",
							governedCase: "Dat",
						},
					},
				},
			},
		},
		"grammar-de-adp-preposition-seit-dat": {
			input: {
				markedContext:
					"Sie wohnt <TARGET>seit</TARGET> einem Jahr hier.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "seit",
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "seit",
						coreFeatures: {
							...nullPeripheralFeatures,
							adpType: "Prep",
							governedCase: "Dat",
						},
					},
				},
			},
		},
		"grammar-de-adp-provisional-circumposition-von-an": {
			input: {
				markedContext:
					"<TARGET>Von</TARGET> morgen <TARGET>an</TARGET> arbeitet sie hier.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard", "Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "von an",
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "von ... an",
						coreFeatures: {
							...nullPeripheralFeatures,
							adpType: "Circ",
							governedCase: "Dat",
						},
					},
				},
			},
			explanation:
				"Provisional policy case: the schema supports Circ, but the Lexeme/Construction boundary and gap notation need human confirmation.",
		},
		"grammar-de-adp-provisional-ext-pos-sconj-anstatt": {
			input: {
				markedContext:
					"<TARGET>Anstatt</TARGET> dass er klagte, half er sofort.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					surface: {
						normalizedSurface: "anstatt",
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "anstatt",
						coreFeatures: {
							...nullPeripheralFeatures,
							adpType: "Prep",
							extPos: "SCONJ",
							governedCase: null,
						},
					},
				},
			},
			explanation:
				"Provisional policy case: ExtPos is schema-valid, but whether the clausal use remains one ADP Lemma needs review.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
