import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, inflection } from "./builders";

export const resolvedCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-sym-percent-unit-citation": {
			input: {
				markedContext:
					"Die Anzeige zeigt 80 <TARGET>%</TARGET> Ladezustand.",
			},
			idealOutput: citation({ normalizedMembers: ["%"] }),
			explanation:
				"The percent sign functions as a symbolic unit marker. Ordinary invariant symbols use Citation and the conservative all-null Core.",
			contaminationKeys: ["de-sym-form:percent-unit"],
		},
		"grammar-de-sym-times-nominal-inflection": {
			input: {
				markedContext:
					"Ein einziges <TARGET>×</TARGET> steht zwischen den Zahlen.",
			},
			idealOutput: inflection({
				normalizedMembers: ["×"],
				case: "Nom",
				gender: "Neut",
				number: "Sing",
			}),
			explanation:
				"The symbol is explicitly used as a neuter singular nominal in nominative agreement. German GSD attests the same × feature bundle, so this is Inflection despite an unchanged glyph.",
			contaminationKeys: ["de-sym-surface:nominal-inflection-times"],
		},
		"grammar-de-sym-equals-equation": {
			input: {
				markedContext: "In der Formel gilt: a <TARGET>=</TARGET> b.",
			},
			idealOutput: citation({ normalizedMembers: ["="] }),
			contaminationKeys: ["de-sym-function:operator"],
		},
		"grammar-de-sym-slash-per": {
			input: {
				markedContext:
					"Die Geschwindigkeit beträgt 50 Kilometer <TARGET>/</TARGET> Stunde.",
			},
			idealOutput: citation({ normalizedMembers: ["/"] }),
			explanation:
				"The slash expresses a symbolic per relation rather than punctuation or a written adposition.",
		},
		"grammar-de-sym-plus-operator": {
			input: {
				markedContext: "Die Rechnung lautet 2 <TARGET>+</TARGET> 3.",
			},
			idealOutput: citation({ normalizedMembers: ["+"] }),
			contaminationKeys: ["de-sym-function:operator"],
		},
		"grammar-de-sym-ampersand-symbolic-coordinator": {
			input: {
				markedContext:
					"Auf dem Schild steht Brot <TARGET>&</TARGET> Kuchen.",
			},
			idealOutput: citation({ normalizedMembers: ["&"] }),
			explanation:
				"The ampersand is an independent graphical coordinator here. It remains SYM with the ordinary all-null Core rather than becoming the written CCONJ und.",
		},
		"grammar-de-sym-euro-currency": {
			input: {
				markedContext: "Der Eintritt kostet 12 <TARGET>€</TARGET>.",
			},
			idealOutput: citation({ normalizedMembers: ["€"] }),
		},
		"grammar-de-sym-degree-unit": {
			input: {
				markedContext: "Heute werden 18 <TARGET>°</TARGET> C erwartet.",
			},
			idealOutput: citation({ normalizedMembers: ["°"] }),
		},
		"grammar-de-sym-asterisk-birth": {
			input: {
				markedContext:
					"Im Kurzlebenslauf steht: Ada Beispiel (<TARGET>*</TARGET> 1980).",
			},
			idealOutput: citation({ normalizedMembers: ["*"] }),
		},
		"grammar-de-sym-emoticon-smile": {
			input: {
				markedContext: "Danke für die Hilfe <TARGET>:-)</TARGET>",
			},
			idealOutput: citation({ normalizedMembers: [":-)"] }),
			explanation:
				"A multi-character emoticon can be one symbolic token and one lexical occurrence.",
			contaminationKeys: ["de-sym-function:emotive-symbol"],
		},
		"grammar-de-sym-emoji-smile": {
			input: { markedContext: "Das freut mich <TARGET>😀</TARGET>" },
			idealOutput: citation({ normalizedMembers: ["😀"] }),
			contaminationKeys: ["de-sym-function:emotive-symbol"],
		},
		"grammar-de-sym-hashtag-sign": {
			input: {
				markedContext:
					"Setze ein <TARGET>#</TARGET> vor das Stichwort, um es zu markieren.",
			},
			idealOutput: citation({ normalizedMembers: ["#"] }),
		},
		"grammar-de-sym-letter-x-multiplication": {
			input: {
				markedContext:
					"Die Abmessungen sind 20 <TARGET>x</TARGET> 30 Zentimeter.",
			},
			idealOutput: citation({ normalizedMembers: ["x"] }),
			explanation:
				"The ASCII multiplication sign is preserved as its own symbolic identity; it is not silently normalized to ×.",
		},
		"grammar-de-sym-middle-dot-dative": {
			input: {
				markedContext:
					"Mit einem <TARGET>·</TARGET> trennt sie die beiden Faktoren.",
			},
			idealOutput: inflection({
				normalizedMembers: ["·"],
				case: "Dat",
				gender: null,
				number: "Sing",
			}),
			explanation:
				"The governing preposition establishes dative and the determiner establishes singular, while the symbol's gender remains unsupported; the glyph itself remains unchanged.",
			contaminationKeys: ["de-sym-surface:nominal-inflection-middle-dot"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
