import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { cardinalCore, citation } from "./builders";

const unresolved = { decision: "Unresolved", resolution: null } as const;

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-num-provisional-fraction-half": {
			input: { markedContext: "Der Anteil beträgt <TARGET>½</TARGET>." },
			idealOutput: unresolved,
			explanation:
				"Quarantined representation dispute: German GSD uses NumType=Card for fraction glyphs while the Dumling NUM codec also permits Frac; do not guess until domain policy chooses an identity.",
		},
		"grammar-de-num-provisional-range-10-12": {
			input: {
				markedContext: "Geöffnet von <TARGET>10–12</TARGET> Uhr.",
			},
			idealOutput: unresolved,
			explanation:
				"Quarantined representation dispute: tokenization and Range identity are not stable enough for an authoritative one-Lexeme oracle.",
		},
		"grammar-de-num-provisional-multiplicative-2x": {
			input: { markedContext: "Bitte <TARGET>2x</TARGET> wiederholen." },
			idealOutput: unresolved,
			explanation:
				"Quarantined representation dispute: German GSD has isolated numeric ADV forms while multiplicatives are outside this NUM route.",
		},
		"grammar-de-num-provisional-abbreviation-t": {
			input: {
				markedContext:
					"Numeral-Abkürzung für Tausend: <TARGET>T</TARGET>",
			},
			idealOutput: citation({
				normalizedSurface: "T",
				canonicalForm: "Tausend",
				coreFeatures: { ...cardinalCore, abbr: "Yes" },
			}),
			explanation:
				"Corpus-only abbreviation probe: establish whether T is a licensed Surface of Tausend and whether Lemma-level Abbr=Yes is the intended exact representation.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
