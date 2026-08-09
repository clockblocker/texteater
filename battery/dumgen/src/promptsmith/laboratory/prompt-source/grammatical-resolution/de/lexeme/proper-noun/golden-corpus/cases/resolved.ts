import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, inflection } from "./builders";

export const resolvedCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-propn-citation-dresden": {
			input: { markedContext: "Namenseintrag: <TARGET>Dresden</TARGET>" },
			idealOutput: citation({
				normalizedMembers: ["Dresden"],
				coreFeatures: { abbr: null, foreign: null, gender: "Neut" },
			}),
			explanation:
				"An explicit name-entry label is Citation; the place-name Lemma has stable neuter grammatical gender.",
		},
		"grammar-de-propn-nom-sing-maria": {
			input: { markedContext: "<TARGET>Maria</TARGET> wartet draußen." },
			idealOutput: inflection({
				normalizedMembers: ["Maria"],
				case: "Nom",
				number: "Sing",
				coreFeatures: { abbr: null, foreign: null, gender: "Fem" },
			}),
			explanation:
				"An ordinary contextual proper name is Inflection; the subject establishes nominative singular.",
		},
		"grammar-de-propn-acc-sing-anna": {
			input: {
				markedContext: "Ich treffe <TARGET>Anna</TARGET> morgen.",
			},
			idealOutput: inflection({
				normalizedMembers: ["Anna"],
				case: "Acc",
				number: "Sing",
				coreFeatures: { abbr: null, foreign: null, gender: "Fem" },
			}),
		},
		"grammar-de-propn-dat-sing-berlin": {
			input: { markedContext: "Wir wohnen in <TARGET>Berlin</TARGET>." },
			idealOutput: inflection({
				normalizedMembers: ["Berlin"],
				case: "Dat",
				number: "Sing",
				coreFeatures: { abbr: null, foreign: null, gender: "Neut" },
			}),
		},
		"grammar-de-propn-nom-sing-deutschland": {
			input: {
				markedContext: "<TARGET>Deutschland</TARGET> liegt in Europa.",
			},
			idealOutput: inflection({
				normalizedMembers: ["Deutschland"],
				case: "Nom",
				number: "Sing",
				coreFeatures: { abbr: null, foreign: null, gender: "Neut" },
			}),
		},
		"grammar-de-propn-acc-sing-schweiz": {
			input: {
				markedContext: "Sie besucht die <TARGET>Schweiz</TARGET>.",
			},
			idealOutput: inflection({
				normalizedMembers: ["Schweiz"],
				case: "Acc",
				number: "Sing",
				coreFeatures: { abbr: null, foreign: null, gender: "Fem" },
			}),
		},
		"grammar-de-propn-gen-sing-peters": {
			input: {
				markedContext: "<TARGET>Peters</TARGET> Fahrrad ist neu.",
			},
			idealOutput: inflection({
				normalizedMembers: ["Peters"],
				canonicalForm: "Peter",
				case: "Gen",
				number: "Sing",
				coreFeatures: { abbr: null, foreign: null, gender: "Masc" },
			}),
			explanation:
				"The articleless proper-name genitive keeps -s on the contextual Surface and removes it only in the Lemma canonicalForm.",
		},
		"grammar-de-propn-gen-sing-deutschlands": {
			input: {
				markedContext:
					"<TARGET>Deutschlands</TARGET> Hauptstadt ist Berlin.",
			},
			idealOutput: inflection({
				normalizedMembers: ["Deutschlands"],
				canonicalForm: "Deutschland",
				case: "Gen",
				number: "Sing",
				coreFeatures: { abbr: null, foreign: null, gender: "Neut" },
			}),
		},
		"grammar-de-propn-gen-sing-hans-apostrophe": {
			input: {
				markedContext: "<TARGET>Hans'</TARGET> Auto steht draußen.",
			},
			idealOutput: inflection({
				normalizedMembers: ["Hans'"],
				canonicalForm: "Hans",
				case: "Gen",
				number: "Sing",
				coreFeatures: { abbr: null, foreign: null, gender: "Masc" },
			}),
			explanation:
				"A name ending in an s-sound marks the articleless genitive with an apostrophe in writing.",
		},
		"grammar-de-propn-vocative-anna": {
			input: { markedContext: "Hallo, <TARGET>Anna</TARGET>!" },
			idealOutput: inflection({
				normalizedMembers: ["Anna"],
				case: null,
				number: "Sing",
				coreFeatures: { abbr: null, foreign: null, gender: "Fem" },
			}),
			explanation:
				"German has no modeled vocative Case value; retain singular Number and leave Case null.",
		},
		"grammar-de-propn-dat-plur-niederlanden": {
			input: {
				markedContext: "Sie lebt in den <TARGET>Niederlanden</TARGET>.",
			},
			idealOutput: inflection({
				normalizedMembers: ["Niederlanden"],
				canonicalForm: "Niederlande",
				case: "Dat",
				number: "Plur",
				coreFeatures: { abbr: null, foreign: null, gender: null },
			}),
			explanation:
				"Niederlande is a lexical plural-only place name: the context establishes dative plural, while German plural does not distinguish a Lemma Gender, so gender remains null.",
		},
		"grammar-de-propn-citation-hamburg": {
			input: { markedContext: "Namensliste: <TARGET>Hamburg</TARGET>" },
			idealOutput: citation({
				normalizedMembers: ["Hamburg"],
				coreFeatures: { abbr: null, foreign: null, gender: "Neut" },
			}),
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
