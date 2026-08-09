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

export const coreFeatureCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-det-demo-definite-article-der": {
			input: { markedContext: "<TARGET>Der</TARGET> Hund schläft." },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["der"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							...nullInflection,
							case: "Nom",
							gender: "Masc",
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
				"The article's definiteness and type belong to the Lemma; nominative masculine singular agreement belongs to the contextual Inflection Surface.",
		},
		"grammar-de-det-demo-possessive-meinem": {
			input: {
				markedContext: "Ich helfe <TARGET>meinem</TARGET> Bruder.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["meinem"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							...nullInflection,
							case: "Dat",
							gender: "Masc",
							number: "Sing",
							"number[psor]": "Sing",
						},
					},
					lemma: {
						canonicalForm: "mein",
						coreFeatures: {
							...nullCore,
							person: "1",
							poss: "Yes",
							pronType: "Prs",
						},
					},
				},
			},
			explanation:
				"Possessor person and Poss are stable Lemma features; agreement with Bruder and singular possessor number occupy separate Surface fields.",
		},
		"grammar-de-det-demo-possessive-eurem": {
			input: {
				markedContext: "Wir folgen <TARGET>eurem</TARGET> Rat.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["eurem"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							...nullInflection,
							case: "Dat",
							gender: "Masc",
							number: "Sing",
							"number[psor]": "Plur",
						},
					},
					lemma: {
						canonicalForm: "euer",
						coreFeatures: {
							...nullCore,
							person: "2",
							poss: "Yes",
							pronType: "Prs",
						},
					},
				},
			},
			explanation:
				"Agreement with Rat is dative masculine singular, while the distinct possessor layer records the plural possessor number lexicalized by euer.",
		},
		"grammar-de-det-demo-citation-irgendein": {
			input: {
				markedContext: "Wörterbucheintrag: <TARGET>irgendein</TARGET>",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["irgendein"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
					lemma: {
						canonicalForm: "irgendein",
						coreFeatures: {
							...nullCore,
							pronType: "Ind",
						},
					},
				},
			},
			explanation:
				"An explicit entry label is a Citation Surface and therefore carries no contextual agreement features.",
		},
		"grammar-de-det-demo-standalone-jener": {
			input: { markedContext: "<TARGET>Jener</TARGET> war günstiger." },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["jener"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							...nullInflection,
							case: "Nom",
							gender: "Masc",
							number: "Sing",
						},
					},
					lemma: {
						canonicalForm: "jener",
						coreFeatures: { ...nullCore, pronType: "Dem" },
					},
				},
			},
			explanation:
				"German UD assigns the lexeme jener to DET even when it heads a nominal without an accompanying noun.",
		},
		"grammar-de-det-indefinite-article-einen": {
			input: {
				markedContext: "Sie kauft <TARGET>einen</TARGET> Mantel.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["einen"],
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
		},
		"grammar-de-det-demonstrative-diesem": {
			input: {
				markedContext: "Mit <TARGET>diesem</TARGET> Plan klappt es.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["diesem"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							...nullInflection,
							case: "Dat",
							gender: "Masc",
							number: "Sing",
						},
					},
					lemma: {
						canonicalForm: "dieser",
						coreFeatures: { ...nullCore, pronType: "Dem" },
					},
				},
			},
		},
		"grammar-de-det-interrogative-welchen": {
			input: {
				markedContext: "<TARGET>Welchen</TARGET> Weg nehmen wir?",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["welchen"],
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
						canonicalForm: "welcher",
						coreFeatures: { ...nullCore, pronType: "Int" },
					},
				},
			},
		},
		"grammar-de-det-negative-kein": {
			input: { markedContext: "Wir haben <TARGET>kein</TARGET> Brot." },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["kein"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							...nullInflection,
							case: "Acc",
							gender: "Neut",
							number: "Sing",
						},
					},
					lemma: {
						canonicalForm: "kein",
						coreFeatures: { ...nullCore, pronType: "Neg" },
					},
				},
			},
		},
		"grammar-de-det-total-alle": {
			input: { markedContext: "<TARGET>Alle</TARGET> Gäste warten." },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["alle"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							...nullInflection,
							case: "Nom",
							gender: "Masc",
							number: "Plur",
						},
					},
					lemma: {
						canonicalForm: "alle",
						coreFeatures: { ...nullCore, pronType: "Tot" },
					},
				},
			},
		},
		"grammar-de-det-total-beide-cardinal": {
			input: { markedContext: "Ich kenne <TARGET>beide</TARGET> Wege." },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["beide"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							...nullInflection,
							case: "Acc",
							gender: "Masc",
							number: "Plur",
						},
					},
					lemma: {
						canonicalForm: "beide",
						coreFeatures: {
							...nullCore,
							numType: "Card",
							pronType: "Tot",
						},
					},
				},
			},
		},
		"grammar-de-det-possessive-deinen": {
			input: { markedContext: "Ich sehe <TARGET>deinen</TARGET> Hund." },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["deinen"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							...nullInflection,
							case: "Acc",
							gender: "Masc",
							number: "Sing",
							"number[psor]": "Sing",
						},
					},
					lemma: {
						canonicalForm: "dein",
						coreFeatures: {
							...nullCore,
							person: "2",
							poss: "Yes",
							pronType: "Prs",
						},
					},
				},
			},
		},
		"grammar-de-det-possessive-unserem": {
			input: {
				markedContext:
					"Mit <TARGET>unserem</TARGET> Team gewinnen wir.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["unserem"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							...nullInflection,
							case: "Dat",
							gender: "Neut",
							number: "Sing",
							"number[psor]": "Plur",
						},
					},
					lemma: {
						canonicalForm: "unser",
						coreFeatures: {
							...nullCore,
							person: "1",
							poss: "Yes",
							pronType: "Prs",
						},
					},
				},
			},
		},
		"grammar-de-det-possessive-seinen": {
			input: {
				markedContext: "Er besucht <TARGET>seinen</TARGET> Vater.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["seinen"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							...nullInflection,
							case: "Acc",
							gender: "Masc",
							"gender[psor]": "Masc",
							number: "Sing",
							"number[psor]": "Sing",
						},
					},
					lemma: {
						canonicalForm: "sein",
						coreFeatures: {
							...nullCore,
							person: "3",
							poss: "Yes",
							pronType: "Prs",
						},
					},
				},
			},
		},
		"grammar-de-det-formal-possessive-ihrem": {
			input: {
				markedContext:
					"Mit <TARGET>Ihrem</TARGET> Antrag beginnt die Prüfung.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
					normalizedMembers: ["Ihrem"],
					surface: {
						spelling: "Canonical",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							...nullInflection,
							case: "Dat",
							gender: "Masc",
							number: "Sing",
						},
					},
					lemma: {
						canonicalForm: "Ihr",
						coreFeatures: {
							...nullCore,
							person: "2",
							polite: "Form",
							poss: "Yes",
							pronType: "Prs",
						},
					},
				},
			},
			explanation:
				"Formal possessive Ihr is lexically capitalized in every position; normalization must preserve that contrast from third-person ihr.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
