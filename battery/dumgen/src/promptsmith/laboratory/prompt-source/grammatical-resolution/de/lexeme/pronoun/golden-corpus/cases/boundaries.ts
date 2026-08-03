import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { unresolved } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-pron-unresolved-adjective-schnell": {
			input: {
				markedContext: "Hunde laufen <TARGET>schnell</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"Productive adverbial use does not change the adjective Lexeme schnell into a PRON Lexeme.",
			contaminationKeys: ["de-pron-route-boundary:adjective-schnell"],
		},
		"grammar-de-pron-unresolved-determiner-jener": {
			input: { markedContext: "<TARGET>Jener</TARGET> wartet draußen." },
			idealOutput: unresolved,
			explanation:
				"German UD keeps the inflecting lexeme jener on DET even when it heads a nominal alone.",
			contaminationKeys: ["de-pron-route-boundary:standalone-determiner"],
		},
		"grammar-de-pron-unresolved-determiner-dieser": {
			input: { markedContext: "<TARGET>Dieser</TARGET> wartet draußen." },
			idealOutput: unresolved,
			explanation:
				"German UD keeps the inflecting lexeme dieser on DET even when it heads a nominal alone.",
			contaminationKeys: ["de-pron-route-boundary:standalone-determiner"],
		},
		"grammar-de-pron-unresolved-adverb-etwas": {
			input: { markedContext: "Das ist <TARGET>etwas</TARGET> besser." },
			idealOutput: unresolved,
			explanation:
				"The degree-modifier occurrence of etwas is ADV rather than the substantive PRON lexeme.",
		},
		"grammar-de-pron-unresolved-numeral-zwei": {
			input: { markedContext: "Die Nummer ist <TARGET>zwei</TARGET>." },
			idealOutput: unresolved,
			explanation:
				"A self-standing cardinal remains on the NUM route rather than becoming a PRON Lexeme.",
			contaminationKeys: ["de-pron-route-boundary:standalone-cardinal"],
		},
		"grammar-de-pron-unresolved-numeral-eins": {
			input: { markedContext: "Die Nummer ist <TARGET>eins</TARGET>." },
			idealOutput: unresolved,
			explanation:
				"A self-standing cardinal remains on the NUM route rather than becoming a PRON Lexeme.",
			contaminationKeys: ["de-pron-route-boundary:standalone-cardinal"],
		},
		"grammar-de-pron-unresolved-nominalized-ich": {
			input: {
				markedContext: "Das <TARGET>Ich</TARGET> steht im Mittelpunkt.",
			},
			idealOutput: unresolved,
			explanation:
				"The article establishes the nominalized NOUN lexeme Ich.",
		},
		"grammar-de-pron-unresolved-overbroad-mit-ihm": {
			input: { markedContext: "Ich spreche <TARGET>mit ihm</TARGET>." },
			idealOutput: unresolved,
			explanation:
				"The target contains an ADP dependent in addition to the pronoun lexeme.",
		},
		"grammar-de-pron-unresolved-repeated-sie": {
			input: {
				markedContext:
					"<TARGET>Sie</TARGET> kam früh und <TARGET>sie</TARGET> blieb lange.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-pron-unresolved-unrelated-targets": {
			input: {
				markedContext:
					"<TARGET>Wir</TARGET> warten hier und <TARGET>ihr</TARGET> wartet dort.",
			},
			idealOutput: unresolved,
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
