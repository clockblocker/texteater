import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { inflection, unmarkedCore } from "./builders";

export const featurePolicyCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adj-ordinal-erste": {
			input: {
				markedContext: "Der <TARGET>erste</TARGET> Versuch gelang.",
			},
			idealOutput: inflection({
				normalizedMembers: ["erste"],
				canonicalForm: "erst",
				coreFeatures: { ...unmarkedCore, numType: "Ord" },
				inflectionalFeatures: {
					case: "Nom",
					degree: "Pos",
					gender: "Masc",
					number: "Sing",
				},
			}),
		},
		"grammar-de-adj-provisional-short-moeglich": {
			input: {
				markedContext: "Die Lösung ist <TARGET>möglich</TARGET>.",
			},
			idealOutput: inflection({
				normalizedMembers: ["möglich"],
				canonicalForm: "möglich",
				coreFeatures: { ...unmarkedCore, variant: "Short" },
				inflectionalFeatures: {
					case: null,
					degree: "Pos",
					gender: null,
					number: null,
				},
			}),
			explanation:
				"Corpus-only probe: German-HDT uses Variant=Short on uninflected ADJ tokens, but Dumling currently stores Variant in Lemma Core Features.",
		},
		"grammar-de-adj-provisional-card-siebenhundert": {
			input: {
				markedContext:
					"Sie las die <TARGET>siebenhundert</TARGET> Seiten.",
			},
			idealOutput: inflection({
				normalizedMembers: ["siebenhundert"],
				canonicalForm: "siebenhundert",
				coreFeatures: { ...unmarkedCore, numType: "Card" },
				inflectionalFeatures: {
					case: null,
					degree: "Pos",
					gender: null,
					number: null,
				},
			}),
			explanation:
				"Corpus-only probe: GSD attests ADJ NumType=Card, but the Lexeme/ADJ versus NUM policy remains unsettled.",
		},
		"grammar-de-adj-provisional-foreign-cool": {
			input: { markedContext: "Das klingt <TARGET>cool</TARGET>." },
			idealOutput: inflection({
				normalizedMembers: ["cool"],
				canonicalForm: "cool",
				coreFeatures: { ...unmarkedCore, foreign: "Yes" },
				inflectionalFeatures: {
					case: null,
					degree: "Pos",
					gender: null,
					number: null,
				},
			}),
			explanation:
				"Corpus-only probe: lexicalization determines whether a borrowed adjective retains Foreign=Yes.",
		},
		"grammar-de-adj-provisional-abbreviation-sog": {
			input: {
				markedContext: "Ein <TARGET>sog.</TARGET> Experte sagte aus.",
			},
			idealOutput: inflection({
				normalizedMembers: ["sog."],
				canonicalForm: "sogenannt",
				coreFeatures: { ...unmarkedCore, abbr: "Yes" },
				inflectionalFeatures: {
					case: "Nom",
					degree: "Pos",
					gender: "Masc",
					number: "Sing",
				},
			}),
			explanation:
				"Corpus-only probe: GSD attests ADJ Abbr=Yes, while abbreviation punctuation and recoverable agreement need a route policy.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
