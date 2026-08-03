import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, ordinarySymbolCore } from "./builders";

const unresolved = { decision: "Unresolved", resolution: null } as const;

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-sym-provisional-foreign-ampersand": {
			input: {
				markedContext:
					"In der englischen Firmenangabe steht ein <TARGET>&</TARGET> zwischen den Namen.",
			},
			idealOutput: citation({
				normalizedSurface: "&",
				coreFeatures: { ...ordinarySymbolCore, foreign: "Yes" },
			}),
			explanation:
				"Corpus-only Core probe: German GSD has one Foreign=Yes ampersand, but ordinary symbolic identity is language-independent and the lexical stability of that feature needs domain confirmation.",
		},
		"grammar-de-sym-provisional-cardinal-percent": {
			input: {
				markedContext:
					"Als Zahlenzeichen steht <TARGET>%</TARGET> hier für einen Anteil.",
			},
			idealOutput: citation({
				normalizedSurface: "%",
				coreFeatures: { ...ordinarySymbolCore, numType: "Card" },
			}),
			explanation:
				"Corpus-only Core probe: Dumling permits SYM NumType=Card, but German GSD attests no SYM NumType at all; do not teach or score this identity until policy decides it.",
		},
		"grammar-de-sym-provisional-range-dash": {
			input: {
				markedContext: "Geöffnet von 10<TARGET>–</TARGET>12 Uhr.",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only representation dispute: the codec permits NumType=Range, but a range dash can instead be punctuation and German GSD supplies no SYM NumType oracle.",
		},
		"grammar-de-sym-provisional-keycap-emoji": {
			input: {
				markedContext: "Drücke <TARGET>1️⃣</TARGET>, um zu starten.",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only tokenization probe: this multi-code-point keycap can be an emoji symbol or a visually numerical composite; segmentation policy must decide the stable identity first.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
