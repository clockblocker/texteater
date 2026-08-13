import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, finite, inflection, ordinaryCore } from "./builders";

export const formCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-verb-finite-liest": {
			input: {
				markedContext: "Sie <TARGET>liest</TARGET> leise.",
				members: ["liest"],
			},
			idealOutput: finite(["liest"], "lesen", {
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
			}),
		},
		"grammar-de-verb-citation-arbeiten": {
			input: {
				markedContext:
					"Wörterbucheintrag Vollverb: <TARGET>arbeiten</TARGET>",
				members: ["arbeiten"],
			},
			idealOutput: citation({
				normalizedMembers: ["arbeiten"],
				canonicalForm: "arbeiten",
			}),
		},
		"grammar-de-verb-past-ging": {
			input: {
				markedContext: "Er <TARGET>ging</TARGET> nach Hause.",
				members: ["ging"],
			},
			idealOutput: finite(["ging"], "gehen", {
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Past",
			}),
		},
		"grammar-de-verb-imperative-lauf": {
			input: {
				markedContext: "<TARGET>Lauf</TARGET> schneller!",
				members: ["Lauf"],
			},
			idealOutput: inflection({
				normalizedMembers: ["lauf"],
				canonicalForm: "laufen",
				inflectionalFeatures: {
					mood: "Imp",
					number: "Sing",
					person: "2",
					tense: null,
					verbForm: "Fin",
					voice: null,
				},
			}),
		},
		"grammar-de-verb-infinitive-hinauszulaufen": {
			input: {
				markedContext: "Er versucht, <TARGET>hinauszulaufen</TARGET>.",
				members: ["hinauszulaufen"],
			},
			idealOutput: inflection({
				normalizedMembers: ["hinauszulaufen"],
				canonicalForm: "hinauslaufen",
				coreFeatures: {
					...ordinaryCore,
					hasSepPrefix: "hinaus",
				},
				inflectionalFeatures: {
					mood: null,
					number: null,
					person: null,
					tense: null,
					verbForm: "Inf",
					voice: null,
				},
			}),
		},
		"grammar-de-verb-participle-mitgebracht": {
			input: {
				markedContext:
					"Die Peitsche <TARGET>hat</TARGET> er <TARGET>mitgebracht</TARGET>.",
				members: ["hat", "mitgebracht"],
			},
			idealOutput: inflection({
				normalizedMembers: ["hat", "mitgebracht"],
				canonicalForm: "mitbringen",
				memberOrthographies: ["Standard", "Standard"],
				coreFeatures: {
					...ordinaryCore,
					hasSepPrefix: "mit",
				},
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
			}),
		},
		"grammar-de-verb-participle-gesungen": {
			input: {
				markedContext:
					"Sie <TARGET>hat</TARGET> <TARGET>gesungen</TARGET>.",
				members: ["hat", "gesungen"],
			},
			idealOutput: inflection({
				normalizedMembers: ["hat", "gesungen"],
				canonicalForm: "singen",
				memberOrthographies: ["Standard", "Standard"],
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
			}),
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
