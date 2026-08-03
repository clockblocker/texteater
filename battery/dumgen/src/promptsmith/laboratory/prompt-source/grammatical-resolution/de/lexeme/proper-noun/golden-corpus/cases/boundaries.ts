import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { unresolved } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-propn-unresolved-multi-token-angela-merkel": {
			input: {
				markedContext:
					"<TARGET>Angela Merkel</TARGET> hielt eine Rede.",
			},
			idealOutput: unresolved,
			explanation:
				"A personal name containing two word-like PROPN tokens is a named entity, not one Lexeme Surface.",
			contaminationKeys: ["de-propn-scope:multi-token-name"],
		},
		"grammar-de-propn-unresolved-common-noun-stadt": {
			input: { markedContext: "Die <TARGET>Stadt</TARGET> wächst." },
			idealOutput: unresolved,
		},
		"grammar-de-propn-unresolved-adjective-schnell": {
			input: { markedContext: "Der Zug ist <TARGET>schnell</TARGET>." },
			idealOutput: unresolved,
		},
		"grammar-de-propn-unresolved-numeral-2024": {
			input: {
				markedContext: "Das geschah im Jahr <TARGET>2024</TARGET>.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-propn-unresolved-verb-reisen": {
			input: { markedContext: "Wir <TARGET>reisen</TARGET> morgen ab." },
			idealOutput: unresolved,
		},
		"grammar-de-propn-unresolved-multi-token-johann-wolfgang": {
			input: {
				markedContext:
					"<TARGET>Johann Wolfgang</TARGET> schrieb einen Brief.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-propn-scope:multi-token-name"],
		},
		"grammar-de-propn-unresolved-repeated-peter": {
			input: {
				markedContext:
					"<TARGET>Peter</TARGET> kam, und später ging <TARGET>Peter</TARGET> wieder.",
			},
			idealOutput: unresolved,
			explanation:
				"Repeated occurrences of one name are distinct lexical targets, not members of one Surface.",
		},
		"grammar-de-propn-unresolved-unrelated-anna-berlin": {
			input: {
				markedContext:
					"<TARGET>Anna</TARGET> fährt morgen nach <TARGET>Berlin</TARGET>.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-propn-unresolved-overbroad-stadt-berlin": {
			input: {
				markedContext: "Die <TARGET>Stadt Berlin</TARGET> wächst.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-propn-scope:multi-token-name"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
