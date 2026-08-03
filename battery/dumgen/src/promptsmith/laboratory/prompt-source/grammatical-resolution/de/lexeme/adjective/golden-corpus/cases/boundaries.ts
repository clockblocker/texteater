import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const unresolved = {
	decision: "Unresolved" as const,
	resolution: null,
};

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adj-unresolved-perfect-participle-gesungen": {
			input: { markedContext: "Sie hat <TARGET>gesungen</TARGET>." },
			idealOutput: unresolved,
			explanation:
				"A participle selected by the perfect auxiliary belongs to the VERB route.",
			contaminationKeys: ["de-adj-boundary:perfect-participle"],
		},
		"grammar-de-adj-unresolved-lexical-adverb": {
			input: { markedContext: "Wir treffen uns <TARGET>heute</TARGET>." },
			idealOutput: unresolved,
		},
		"grammar-de-adj-unresolved-perfect-participle": {
			input: {
				markedContext: "Er hat gestern <TARGET>gearbeitet</TARGET>.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-adj-boundary:perfect-participle"],
		},
		"grammar-de-adj-unresolved-overbroad-modifier": {
			input: {
				markedContext: "Sie spricht <TARGET>sehr leise</TARGET>.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-adj-unresolved-repeated-surfaces": {
			input: {
				markedContext:
					"Der <TARGET>helle</TARGET> Raum führt in den <TARGET>hellen</TARGET> Flur.",
			},
			idealOutput: unresolved,
			explanation:
				"Two occurrences of one Lemma are two distinct inflected Surfaces, not members of one Surface.",
		},
		"grammar-de-adj-unresolved-unrelated-targets": {
			input: {
				markedContext:
					"Sie öffnet die Tür <TARGET>leise</TARGET> und geht <TARGET>ruhig</TARGET> hinaus.",
			},
			idealOutput: unresolved,
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
