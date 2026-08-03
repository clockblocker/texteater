import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { unresolved } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-x-unresolved-noun-computer": {
			input: {
				markedContext:
					"Der <TARGET>Computer</TARGET> steht auf dem Tisch.",
			},
			idealOutput: unresolved,
			explanation:
				"An established German loan with ordinary nominal syntax belongs to NOUN, not to the residual X route.",
		},
		"grammar-de-x-unresolved-gibberish-xqzv": {
			input: {
				markedContext:
					"Unleserliche Zeichenfolge: <TARGET>xqzv</TARGET>",
			},
			idealOutput: unresolved,
			explanation:
				"Gibberish is not a word-like Lexeme identity in this product model and remains Unresolved for upstream OpaqueText handling.",
		},
		"grammar-de-x-unresolved-foreign-noun-house": {
			input: {
				markedContext:
					"Als englisches Substantiv analysiert: <TARGET>house</TARGET>",
			},
			idealOutput: unresolved,
			explanation:
				"The English span is non-primary-language OpaqueText in the current chain; its explicit NOUN analysis also shows why a future multilingual route must not force X.",
		},
		"grammar-de-x-unresolved-propn-paris": {
			input: { markedContext: "Wir reisen nach <TARGET>Paris</TARGET>." },
			idealOutput: unresolved,
			explanation:
				"The place name is PROPN rather than residual X material.",
		},
		"grammar-de-x-unresolved-propn-apple": {
			input: {
				markedContext:
					"<TARGET>Apple</TARGET> veröffentlichte einen Bericht.",
			},
			idealOutput: unresolved,
			explanation:
				"A foreign organization name with an established proper-noun identity remains PROPN.",
		},
		"grammar-de-x-unresolved-intj-ouch": {
			input: {
				markedContext: "Englischer Ausruf: <TARGET>ouch</TARGET>!",
			},
			idealOutput: unresolved,
			explanation:
				"The English span is currently OpaqueText; its explicit interjection identity also rules out X under any future multilingual routing.",
		},
		"grammar-de-x-unresolved-sym-percent": {
			input: {
				markedContext: "Die Rate beträgt fünf <TARGET>%</TARGET>.",
			},
			idealOutput: unresolved,
			explanation: "A percent sign is SYM, not a word-like X Lexeme.",
		},
		"grammar-de-x-unresolved-sym-dagger": {
			input: {
				markedContext: "Johann Beispiel (<TARGET>†</TARGET> 1728)",
			},
			idealOutput: unresolved,
			explanation:
				"The conventional death marker is a symbol even though noisy GSD data sometimes assigns it X.",
		},
		"grammar-de-x-unresolved-punct-exclamation": {
			input: { markedContext: "Achtung<TARGET>!</TARGET>" },
			idealOutput: unresolved,
			explanation: "Sentence punctuation belongs to PUNCT rather than X.",
		},
		"grammar-de-x-unresolved-opaque-question-marks": {
			input: {
				markedContext: "Unleserlicher Inhalt: <TARGET>????</TARGET>",
			},
			idealOutput: unresolved,
			explanation:
				"A non-word opaque placeholder is not a Lexeme/X identity and belongs upstream as OpaqueText.",
		},
		"grammar-de-x-unresolved-fragment-unver": {
			input: {
				markedContext:
					"Er begann mit <TARGET>unver-</TARGET> und brach ab.",
			},
			idealOutput: unresolved,
			explanation:
				"A truncated word fragment has no complete Lexeme identity under the adopted product policy.",
		},
		"grammar-de-x-unresolved-email": {
			input: {
				markedContext: "Kontakt: <TARGET>support@example.org</TARGET>",
			},
			idealOutput: unresolved,
			explanation:
				"An email address is a structured non-word span, not an unanalyzed foreign word Lexeme.",
		},
		"grammar-de-x-unresolved-overbroad-good-morning": {
			input: {
				markedContext:
					"Unanalysierte englische Wortfolge: <TARGET>good morning</TARGET>",
			},
			idealOutput: unresolved,
			explanation:
				"The target spans two words and cannot be collapsed into one Lexeme/X Surface.",
		},
		"grammar-de-x-unresolved-repeated-bonjour": {
			input: {
				markedContext:
					"Unanalysierte Wörter: <TARGET>bonjour</TARGET> und <TARGET>bonjour</TARGET>",
			},
			idealOutput: unresolved,
			explanation:
				"More than one TARGET pair is unresolved even when both targets repeat one word.",
		},
		"grammar-de-x-unresolved-unbalanced-bonjour": {
			input: {
				markedContext:
					"Unanalysiertes französisches Fremdwort: <TARGET>bonjour",
			},
			idealOutput: unresolved,
			explanation: "Unbalanced TARGET markup cannot resolve.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
