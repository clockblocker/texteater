import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { unresolved } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-verb-unresolved-perfect-aux-hat": {
			input: {
				markedContext: "Sie <TARGET>hat</TARGET> schon gegessen.",
			},
			idealOutput: unresolved,
			explanation:
				"Perfect-forming haben belongs to Lexeme/AUX, not this fixed VERB route.",
		},
		"grammar-de-verb-unresolved-modal-aux-kann": {
			input: {
				markedContext: "Das Kind <TARGET>kann</TARGET> schwimmen.",
			},
			idealOutput: unresolved,
			explanation:
				"Können governing a bare infinitive is a modal AUX use.",
		},
		"grammar-de-verb-unresolved-attributive-participle": {
			input: {
				markedContext:
					"Sie öffnet die <TARGET>geschlossene</TARGET> Tür.",
			},
			idealOutput: unresolved,
			explanation:
				"The attributive participle carries adjectival agreement and belongs to Lexeme/ADJ.",
		},
		"grammar-de-verb-unresolved-overbroad-aux-participle": {
			input: {
				markedContext: "Sie <TARGET>hat gegessen</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The TARGET combines an AUX and a lexical VERB rather than marking one lexical Surface.",
		},
		"grammar-de-verb-unresolved-overbroad-reflexive": {
			input: {
				markedContext:
					"Sie <TARGET>freut sich</TARGET> über den Besuch.",
			},
			idealOutput: unresolved,
			explanation:
				"The reflexive pronoun is evidence for lexical reflexivity but is not a member of the VERB Surface.",
		},
		"grammar-de-verb-unresolved-overbroad-governed-preposition": {
			input: {
				markedContext: "Sie <TARGET>wartet auf</TARGET> den Zug.",
			},
			idealOutput: unresolved,
			explanation:
				"A governed preposition is a Lemma feature and contextual dependent, not a verbal member.",
		},
		"grammar-de-verb-unresolved-repeated-schlaeft": {
			input: {
				markedContext:
					"Das Kind <TARGET>schläft</TARGET>, und der Hund <TARGET>schläft</TARGET> auch.",
			},
			idealOutput: unresolved,
			explanation:
				"Repeated occurrences are distinct Surfaces, not members of one Surface.",
		},
		"grammar-de-verb-unresolved-unrelated-targets": {
			input: {
				markedContext:
					"Sie <TARGET>kocht</TARGET>, während er <TARGET>putzt</TARGET>.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-verb-unresolved-prefix-only": {
			input: { markedContext: "Sie hört sofort <TARGET>auf</TARGET>." },
			idealOutput: unresolved,
			explanation:
				"A detached prefix alone is not the complete separable VERB Surface.",
			contaminationKeys: ["de-verb-boundary:incomplete-separable"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
