import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const citation = (normalizedSurface: string) => ({
	normalizedSurface,
	spelling: "Canonical" as const,
	realizationCoverage: "Full" as const,
	surfaceKind: "Citation" as const,
	surfaceFeatures: null,
});

const finite = (args: {
	normalizedSurface: string;
	mood: "Ind" | "Sub";
	number: "Sing" | "Plur";
	person: "1" | "2" | "3";
	tense: "Past" | "Pres";
}) => ({
	normalizedSurface: args.normalizedSurface,
	spelling: "Canonical" as const,
	realizationCoverage: "Full" as const,
	surfaceKind: "Inflection" as const,
	surfaceFeatures: null,
	inflectionalFeatures: {
		mood: args.mood,
		number: args.number,
		person: args.person,
		tense: args.tense,
		verbForm: "Fin" as const,
		voice: null,
	},
});

const resolved = (args: {
	surface: ReturnType<typeof finite> | ReturnType<typeof citation>;
	canonicalForm: string;
	verbType: "Mod" | null;
}) => ({
	decision: "Resolved" as const,
	resolution: {
		memberOrthographies: ["Standard" as const],
		surface: args.surface,
		lemma: {
			canonicalForm: args.canonicalForm,
			coreFeatures: { verbType: args.verbType },
		},
	},
});

export const inflectionCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-aux-demo-future-wird": {
			input: {
				markedContext: "Sie <TARGET>wird</TARGET> morgen abreisen.",
			},
			idealOutput: resolved({
				surface: finite({
					normalizedSurface: "wird",
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				}),
				canonicalForm: "werden",
				verbType: null,
			}),
			explanation:
				"Future-forming werden is an ordinary auxiliary; the contextual form is a finite Inflection Surface while verbType remains null.",
		},
		"grammar-de-aux-demo-modal-kann": {
			input: {
				markedContext: "Das Kind <TARGET>kann</TARGET> schwimmen.",
			},
			idealOutput: resolved({
				surface: finite({
					normalizedSurface: "kann",
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				}),
				canonicalForm: "können",
				verbType: "Mod",
			}),
			explanation:
				"Können governing a bare infinitive is a modal auxiliary and therefore has verbType Mod.",
		},
		"grammar-de-aux-demo-modal-citation-duerfen": {
			input: {
				markedContext:
					"Wörterbucheintrag Modalauxiliar: <TARGET>dürfen</TARGET>",
			},
			idealOutput: resolved({
				surface: citation("dürfen"),
				canonicalForm: "dürfen",
				verbType: "Mod",
			}),
			explanation:
				"An explicitly identified dictionary headword is a Citation Surface, not an Inflection Surface.",
		},
		"grammar-de-aux-perfect-ist-gegangen": {
			input: { markedContext: "Sie <TARGET>ist</TARGET> früh gegangen." },
			idealOutput: resolved({
				surface: finite({
					normalizedSurface: "ist",
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				}),
				canonicalForm: "sein",
				verbType: null,
			}),
		},
		"grammar-de-aux-perfect-hat-gegessen": {
			input: {
				markedContext: "Sie <TARGET>hat</TARGET> schon gegessen.",
			},
			idealOutput: resolved({
				surface: finite({
					normalizedSurface: "hat",
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				}),
				canonicalForm: "haben",
				verbType: null,
			}),
		},
		"grammar-de-aux-copula-ist-alt": {
			input: { markedContext: "Der Turm <TARGET>ist</TARGET> alt." },
			idealOutput: resolved({
				surface: finite({
					normalizedSurface: "ist",
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				}),
				canonicalForm: "sein",
				verbType: null,
			}),
			explanation:
				"The fixed AUX route includes copular sein; the current Core Features schema has no separate Cop value.",
		},
		"grammar-de-aux-perfect-waren-gegangen": {
			input: {
				markedContext: "Sie <TARGET>waren</TARGET> schon gegangen.",
			},
			idealOutput: resolved({
				surface: finite({
					normalizedSurface: "waren",
					mood: "Ind",
					number: "Plur",
					person: "3",
					tense: "Past",
				}),
				canonicalForm: "sein",
				verbType: null,
			}),
		},
		"grammar-de-aux-subjunctive-waeren-gekommen": {
			input: {
				markedContext:
					"Wenn sie früher gekommen <TARGET>wären</TARGET>, ...",
			},
			idealOutput: resolved({
				surface: finite({
					normalizedSurface: "wären",
					mood: "Sub",
					number: "Plur",
					person: "3",
					tense: "Past",
				}),
				canonicalForm: "sein",
				verbType: null,
			}),
		},
		"grammar-de-aux-participle-gewesen": {
			input: {
				markedContext: "Es wäre schön <TARGET>gewesen</TARGET>.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					surface: {
						normalizedSurface: "gewesen",
						spelling: "Canonical",
						realizationCoverage: "Full",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							aspect: null,
							gender: null,
							mood: null,
							number: null,
							person: null,
							tense: null,
							verbForm: "Part",
							voice: null,
						},
					},
					lemma: {
						canonicalForm: "sein",
						coreFeatures: { verbType: null },
					},
				},
			},
		},
		"grammar-de-aux-copular-imperative-sei": {
			input: { markedContext: "<TARGET>Sei</TARGET> vorsichtig!" },
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					surface: {
						normalizedSurface: "sei",
						spelling: "Canonical",
						realizationCoverage: "Full",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							mood: "Imp",
							number: "Sing",
							person: "2",
							tense: null,
							verbForm: "Fin",
							voice: null,
						},
					},
					lemma: {
						canonicalForm: "sein",
						coreFeatures: { verbType: null },
					},
				},
			},
		},
		"grammar-de-aux-infinitive-sein": {
			input: {
				markedContext:
					"Sie wird bereits angekommen <TARGET>sein</TARGET>.",
			},
			idealOutput: {
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					surface: {
						normalizedSurface: "sein",
						spelling: "Canonical",
						realizationCoverage: "Full",
						surfaceKind: "Inflection",
						surfaceFeatures: null,
						inflectionalFeatures: {
							mood: null,
							number: null,
							person: null,
							tense: null,
							verbForm: "Inf",
							voice: null,
						},
					},
					lemma: {
						canonicalForm: "sein",
						coreFeatures: { verbType: null },
					},
				},
			},
		},
		"grammar-de-aux-modal-will-gehen": {
			input: { markedContext: "Sie <TARGET>will</TARGET> heute gehen." },
			idealOutput: resolved({
				surface: finite({
					normalizedSurface: "will",
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				}),
				canonicalForm: "wollen",
				verbType: "Mod",
			}),
		},
		"grammar-de-aux-modal-wollt-gehen": {
			input: { markedContext: "Ihr <TARGET>wollt</TARGET> heute gehen." },
			idealOutput: resolved({
				surface: finite({
					normalizedSurface: "wollt",
					mood: "Ind",
					number: "Plur",
					person: "2",
					tense: "Pres",
				}),
				canonicalForm: "wollen",
				verbType: "Mod",
			}),
		},
		"grammar-de-aux-modal-musste-gehen": {
			input: {
				markedContext: "Gestern <TARGET>musste</TARGET> er gehen.",
			},
			idealOutput: resolved({
				surface: finite({
					normalizedSurface: "musste",
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Past",
				}),
				canonicalForm: "müssen",
				verbType: "Mod",
			}),
		},
		"grammar-de-aux-modal-moechte-bleiben": {
			input: {
				markedContext: "Er <TARGET>möchte</TARGET> gern bleiben.",
			},
			idealOutput: resolved({
				surface: finite({
					normalizedSurface: "möchte",
					mood: "Sub",
					number: "Sing",
					person: "3",
					tense: "Past",
				}),
				canonicalForm: "mögen",
				verbType: "Mod",
			}),
		},
		"grammar-de-aux-modal-muessen-plural": {
			input: { markedContext: "Wir <TARGET>müssen</TARGET> eintreten." },
			idealOutput: resolved({
				surface: finite({
					normalizedSurface: "müssen",
					mood: "Ind",
					number: "Plur",
					person: "1",
					tense: "Pres",
				}),
				canonicalForm: "müssen",
				verbType: "Mod",
			}),
		},
		"grammar-de-aux-modal-wollen-citation": {
			input: {
				markedContext:
					"Lexikon, Modalauxiliar: <TARGET>wollen</TARGET>",
			},
			idealOutput: resolved({
				surface: citation("wollen"),
				canonicalForm: "wollen",
				verbType: "Mod",
			}),
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
