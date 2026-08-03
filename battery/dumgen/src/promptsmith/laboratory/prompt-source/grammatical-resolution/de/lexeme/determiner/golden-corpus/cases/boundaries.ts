import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-det-demo-unresolved-relative-der": {
			input: {
				markedContext:
					"Das ist der Mann, <TARGET>der</TARGET> gestern angerufen hat.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"The relative-pronoun lexeme der belongs to Lexeme/PRON even though it is homonymous with the definite article.",
		},
		"grammar-de-det-demo-unresolved-fusion-zum": {
			input: { markedContext: "Wir gehen <TARGET>zum</TARGET> Bahnhof." },
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"zum fuses the adposition zu and determiner dem and cannot be flattened into one DET Lexeme.",
		},
		"grammar-de-det-demo-unresolved-overbroad-dieser-alte": {
			input: {
				markedContext: "<TARGET>Dieser alte</TARGET> Wagen fährt noch.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"The TARGET includes the adjectival dependent alte rather than only lexical material of the determiner.",
		},
		"grammar-de-det-unresolved-personal-pronoun-er": {
			input: { markedContext: "<TARGET>Er</TARGET> wartet draußen." },
			idealOutput: { decision: "Unresolved", resolution: null },
		},
		"grammar-de-det-unresolved-interrogative-pronoun-wer": {
			input: { markedContext: "<TARGET>Wer</TARGET> wartet draußen?" },
			idealOutput: { decision: "Unresolved", resolution: null },
		},
		"grammar-de-det-unresolved-numeral-eins": {
			input: {
				markedContext: "Die Liniennummer ist <TARGET>eins</TARGET>.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"The self-standing numeral eins is a NUM lexeme, unlike determiner ein.",
		},
		"grammar-de-det-unresolved-two-unrelated-targets": {
			input: {
				markedContext:
					"<TARGET>Dieser</TARGET> Mantel und <TARGET>jener</TARGET> Schal passen.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
		},
		"grammar-de-det-unresolved-repeated-same-lemma-dieser": {
			input: {
				markedContext:
					"<TARGET>Dieser</TARGET> Mantel ist teurer als <TARGET>dieser</TARGET> Schal.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"This route resolves exactly one marked determiner occurrence; repeated forms of one Lemma are still separate targets.",
		},
		"grammar-de-det-unresolved-fusion-im": {
			input: {
				markedContext: "Das Buch liegt <TARGET>im</TARGET> Regal.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
