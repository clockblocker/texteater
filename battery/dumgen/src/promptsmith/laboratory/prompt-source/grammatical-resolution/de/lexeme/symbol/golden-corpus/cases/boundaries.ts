import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const unresolved = { decision: "Unresolved", resolution: null } as const;

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-sym-punctuation-comma": {
			input: {
				markedContext:
					"Er kaufte Brot<TARGET>,</TARGET> Milch und Tee.",
			},
			idealOutput: unresolved,
			explanation:
				"A comma organizes written syntax and belongs to PUNCT, not SYM.",
			contaminationKeys: ["de-sym-boundary:sentence-punctuation"],
		},
		"grammar-de-sym-overbroad-five-percent": {
			input: {
				markedContext: "Der Anteil beträgt <TARGET>5 %</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The target contains a NUM token and a SYM token rather than one Symbol Lexeme occurrence.",
			contaminationKeys: ["de-sym-scope:overbroad-expression"],
		},
		"grammar-de-sym-unresolved-period": {
			input: { markedContext: "Der Satz endet hier<TARGET>.</TARGET>" },
			idealOutput: unresolved,
			contaminationKeys: ["de-sym-boundary:sentence-punctuation"],
		},
		"grammar-de-sym-unresolved-exclamation": {
			input: { markedContext: "Achtung<TARGET>!</TARGET>" },
			idealOutput: unresolved,
			contaminationKeys: ["de-sym-boundary:sentence-punctuation"],
		},
		"grammar-de-sym-unresolved-numeral-seven": {
			input: { markedContext: "Die Lösung lautet <TARGET>7</TARGET>." },
			idealOutput: unresolved,
			explanation: "A digit denoting a number is Lexeme/NUM, not SYM.",
		},
		"grammar-de-sym-unresolved-noun-prozent": {
			input: {
				markedContext:
					"Der Anteil beträgt zehn <TARGET>Prozent</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The spelled-out unit is a NOUN; the route must not substitute its associated sign.",
		},
		"grammar-de-sym-unresolved-proper-name-plus": {
			input: {
				markedContext: "Die Serie läuft auf Disney<TARGET>+</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The plus glyph is an inseparable component of a proper service name in this context, not an independent symbol occurrence.",
		},
		"grammar-de-sym-unresolved-function-word-und": {
			input: {
				markedContext: "Tee <TARGET>und</TARGET> Gebäck stehen bereit.",
			},
			idealOutput: unresolved,
			explanation:
				"A written coordinating function word remains CCONJ; it is not resolved by analogy with symbolic ampersand uses.",
		},
		"grammar-de-sym-unresolved-overbroad-emoji-punctuation": {
			input: { markedContext: "Das ist schön<TARGET>! 😀</TARGET>" },
			idealOutput: unresolved,
			explanation:
				"The target combines punctuation and an emotive symbol and cannot be collapsed to one Symbol Lexeme.",
		},
		"grammar-de-sym-unresolved-two-symbol-occurrences": {
			input: {
				markedContext:
					"Er schrieb <TARGET>+</TARGET> links und <TARGET>−</TARGET> rechts.",
			},
			idealOutput: unresolved,
			explanation:
				"Two target pairs mark two separate symbol occurrences, not members of one lexical Surface.",
		},
		"grammar-de-sym-unresolved-name-ampersand": {
			input: {
				markedContext:
					"Sie arbeitet bei Johnson <TARGET>&</TARGET> Johnson.",
			},
			idealOutput: unresolved,
			explanation:
				"Inside the marked proper name, the ampersand is not an independent symbolic relation for this route call.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
