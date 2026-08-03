import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-intj-demo-o-wei-phraseme-boundary": {
			input: {
				markedContext:
					"Da rief die Frau: „<TARGET>O</TARGET> wei! O wei!“",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"The marked O participates in the meaning-bearing formula o wei; it must not be detached into the fixed Lexeme/INTJ route.",
		},
		"grammar-de-intj-demo-punctuation-in-target": {
			input: { markedContext: "Sie rief <TARGET>pfui!</TARGET>" },
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"The TARGET includes punctuation rather than exactly the interjection's lexical material.",
		},
		"grammar-de-intj-unresolved-modal-particle-ja": {
			input: { markedContext: "Das ist <TARGET>ja</TARGET> schön." },
			idealOutput: { decision: "Unresolved", resolution: null },
		},
		"grammar-de-intj-unresolved-na-ja-formula": {
			input: {
				markedContext:
					"Na <TARGET>ja</TARGET>, ganz überzeugt bin ich nicht.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
		},
		"grammar-de-intj-unresolved-nominalized-ach": {
			input: {
				markedContext:
					"Sein ständiges <TARGET>Ach</TARGET> störte die anderen.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
		},
		"grammar-de-intj-unresolved-overbroad-formula": {
			input: {
				markedContext:
					"<TARGET>Ach du meine Güte</TARGET>, was ist passiert?",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
		},
		"grammar-de-intj-unresolved-unrelated-targets": {
			input: {
				markedContext:
					"Er sagte erst <TARGET>ach</TARGET> und später <TARGET>pfui</TARGET>.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
