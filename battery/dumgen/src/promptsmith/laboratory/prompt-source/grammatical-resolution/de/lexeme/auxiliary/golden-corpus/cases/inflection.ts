import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const citation = (normalizedMember: string) => ({
	normalizedMembers: [normalizedMember],
	surface: {
		spelling: "Canonical" as const,
		surfaceKind: "Citation" as const,
		surfaceFeatures: null,
	},
});

const finite = (args: {
	normalizedMembers: readonly string[];
	mood: "Ind" | "Sub";
	number: "Sing" | "Plur";
	person: "1" | "2" | "3";
	tense: "Past" | "Pres";
}) => ({
	normalizedMembers: [...args.normalizedMembers],
	surface: {
		spelling: "Canonical" as const,
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
		normalizedMembers: args.surface.normalizedMembers,
		realizationCoverage: "Full" as const,
		surface: args.surface.surface,
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
					normalizedMembers: ["wird"],
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
					normalizedMembers: ["kann"],
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
					normalizedMembers: ["ist"],
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
					normalizedMembers: ["hat"],
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
					normalizedMembers: ["ist"],
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
					normalizedMembers: ["waren"],
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
					normalizedMembers: ["wären"],
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
					realizationCoverage: "Full",
					normalizedMembers: ["gewesen"],
					surface: {
						spelling: "Canonical",
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
					realizationCoverage: "Full",
					normalizedMembers: ["sei"],
					surface: {
						spelling: "Canonical",
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
					realizationCoverage: "Full",
					normalizedMembers: ["sein"],
					surface: {
						spelling: "Canonical",
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
					normalizedMembers: ["will"],
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
					normalizedMembers: ["wollt"],
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
					normalizedMembers: ["musste"],
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
					normalizedMembers: ["möchte"],
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
					normalizedMembers: ["müssen"],
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
