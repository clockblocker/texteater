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
				"A perfect auxiliary without its lexical head is an incomplete high-level VERB target; standalone AUX remains available only through drill-down.",
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
		"grammar-de-verb-unresolved-modal-complex": {
			input: {
				markedContext:
					"Sie <TARGET>kann</TARGET> <TARGET>schwimmen</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"A modal and its lexical verb remain separate high-level targets.",
		},
		"grammar-de-verb-unresolved-copular-predicate": {
			input: {
				markedContext:
					"Sie <TARGET>ist</TARGET> <TARGET>schön</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"A copula and predicative adjective remain separate high-level targets.",
		},
		"grammar-de-verb-unresolved-contextual-reflexive": {
			input: {
				markedContext:
					"Er <TARGET>wäscht</TARGET> <TARGET>sich</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The contextual reflexive object is not inherent lexical material of waschen.",
		},
		"grammar-de-verb-unresolved-adjunct": {
			input: {
				markedContext:
					"Sie <TARGET>arbeitet</TARGET> <TARGET>im</TARGET> Büro.",
			},
			idealOutput: unresolved,
			explanation:
				"The freely added location adjunct is not a fixed VERB member.",
		},
		"grammar-de-verb-unresolved-modifier": {
			input: {
				markedContext:
					"Sie <TARGET>arbeitet</TARGET> <TARGET>gern</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The free adverbial modifier is not a fixed VERB member.",
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
