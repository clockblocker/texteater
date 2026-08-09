import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const interjectionCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-intj-demo-pfui-expressive": {
			input: {
				markedContext:
					"Sieh einmal, hier steht er, <TARGET>pfui</TARGET>, der Struwwelpeter!",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["pfui"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "pfui",
						coreFeatures: { partType: null },
					},
				},
			},
			explanation:
				"Pfui independently expresses disgust. Its contextual use still has a Citation Surface, and expressive INTJ does not receive response partType Res.",
		},
		"grammar-de-intj-demo-ja-response": {
			input: {
				markedContext:
					"Sie fragte, ob er komme; er antwortete: „<TARGET>Ja</TARGET>.“",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["ja"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "ja",
						coreFeatures: { partType: "Res" },
					},
				},
			},
			explanation:
				"The directly quoted standalone answer ja carries the route's narrow response-interjection feature; ordinary quotation-initial capitalization remains Standard and normalizes to lowercase.",
		},
		"grammar-de-intj-wupp-sound-effect": {
			input: {
				markedContext:
					"Fort geht nun die Mutter und <TARGET>wupp</TARGET>! den Daumen in den Mund.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["wupp"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "wupp",
						coreFeatures: { partType: null },
					},
				},
			},
		},
		"grammar-de-intj-hallo-greeting": {
			input: { markedContext: "<TARGET>Hallo</TARGET>, Lisa!" },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["hallo"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "hallo",
						coreFeatures: { partType: null },
					},
				},
			},
		},
		"grammar-de-intj-hurra-joy": {
			input: { markedContext: "Alle riefen <TARGET>hurra</TARGET>." },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
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
		"grammar-de-intj-oh-reaction": {
			input: { markedContext: "Sie sagte nur: <TARGET>oh</TARGET>." },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["oh"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "oh",
						coreFeatures: { partType: null },
					},
				},
			},
		},
		"grammar-de-intj-huch-surprise": {
			input: { markedContext: "Da sagte sie <TARGET>huch</TARGET>." },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["huch"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "huch",
						coreFeatures: { partType: null },
					},
				},
			},
		},
		"grammar-de-intj-au-pain": {
			input: {
				markedContext: "Er stieß sich und rief <TARGET>au</TARGET>.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["au"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "au",
						coreFeatures: { partType: null },
					},
				},
			},
		},
		"grammar-de-intj-aeh-hesitation": {
			input: {
				markedContext: "Ich wollte, <TARGET>äh</TARGET>, nur fragen.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["äh"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "äh",
						coreFeatures: { partType: null },
					},
				},
			},
		},
		"grammar-de-intj-tja-resignation": {
			input: { markedContext: "Nun, <TARGET>tja</TARGET>, so ist es." },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["tja"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "tja",
						coreFeatures: { partType: null },
					},
				},
			},
		},
		"grammar-de-intj-miau-sound": {
			input: {
				markedContext: "Da sprang die Katze: <TARGET>miau</TARGET>!",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["miau"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "miau",
						coreFeatures: { partType: null },
					},
				},
			},
		},
		"grammar-de-intj-nein-response": {
			input: {
				markedContext:
					"Sie fragte, ob er komme; er antwortete <TARGET>nein</TARGET>.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["nein"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "nein",
						coreFeatures: { partType: "Res" },
					},
				},
			},
		},
		"grammar-de-intj-doch-corrective-response": {
			input: {
				markedContext:
					"Er fragte: „Nicht heute?“ Sie antwortete <TARGET>doch</TARGET>.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["doch"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "doch",
						coreFeatures: { partType: "Res" },
					},
				},
			},
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
