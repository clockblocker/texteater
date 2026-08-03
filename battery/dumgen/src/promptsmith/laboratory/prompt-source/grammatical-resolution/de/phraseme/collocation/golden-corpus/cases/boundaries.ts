import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { unresolved } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-coll-unresolved-free-book-read": {
			input: {
				markedContext:
					"Sie <TARGET>liest</TARGET> <TARGET>ein</TARGET> <TARGET>Buch</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"A freely composed verb-object phrase is not a conventional Collocation.",
			contaminationKeys: ["de-coll-boundary:free-combination"],
		},
		"grammar-de-coll-unresolved-idiom-loeffel": {
			input: {
				markedContext:
					"Irgendwann wird er <TARGET>den</TARGET> <TARGET>Löffel</TARGET> <TARGET>abgeben</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The phrase has an idiomatic whole meaning and belongs to Phraseme/Idiom, not Collocation.",
			contaminationKeys: ["de-coll-boundary:idiom"],
		},
		"grammar-de-coll-unresolved-construction-je-desto": {
			input: {
				markedContext:
					"<TARGET>Je</TARGET> länger er wartet, <TARGET>desto</TARGET> unruhiger wird er.",
			},
			idealOutput: unresolved,
			explanation:
				"Je ... desto is a paired Construction rather than a lexical Collocation.",
			contaminationKeys: ["de-coll-boundary:construction"],
		},
		"grammar-de-coll-unresolved-verb-only-antrag": {
			input: {
				markedContext: "Sie <TARGET>stellt</TARGET> einen Antrag.",
			},
			idealOutput: unresolved,
			explanation:
				"A support verb alone is a Lexeme/VERB target, not a defensible Partial Collocation Surface.",
			contaminationKeys: [
				"de-coll-boundary:verb-only",
				"de-coll-lemma:antrag-stellen",
			],
		},
		"grammar-de-coll-unresolved-overbroad-clause": {
			input: {
				markedContext: "Der Autor <TARGET>übt Kritik</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"One TARGET pair contains several whitespace-separated lexical members; each member requires its own pair.",
			contaminationKeys: [
				"de-coll-boundary:overbroad-target",
				"de-coll-lemma:kritik-ueben",
			],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
