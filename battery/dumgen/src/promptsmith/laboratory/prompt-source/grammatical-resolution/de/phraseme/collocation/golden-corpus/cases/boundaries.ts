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
					"Irgendwann <TARGET>wird</TARGET> er <TARGET>den</TARGET> <TARGET>Löffel</TARGET> <TARGET>abgeben</TARGET>.",
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
		"grammar-de-coll-unresolved-mixed-occurrences": {
			input: {
				markedContext:
					"Sie <TARGET>stellt</TARGET> einen Antrag, und er leistet <TARGET>Abbitte</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The two well-formed marked tokens belong to different Collocation occurrences and cannot form one Surface.",
			contaminationKeys: [
				"de-coll-boundary:mixed-occurrences",
				"de-coll-lemma:antrag-stellen",
				"de-coll-lemma:abbitte-leisten",
			],
		},
		"grammar-de-coll-unresolved-marked-dependent": {
			input: {
				markedContext:
					"Sie <TARGET>stellt</TARGET> <TARGET>einen</TARGET> <TARGET>dringenden</TARGET> <TARGET>Antrag</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The adjective is a contextual modifier, not a lexical member of einen Antrag stellen; marking it makes the proposed Collocation Surface overbroad.",
			contaminationKeys: [
				"de-coll-boundary:marked-dependent",
				"de-coll-lemma:antrag-stellen",
			],
		},
		"grammar-de-coll-unresolved-elliptic-kenntnis": {
			input: {
				markedContext:
					"Sie nahm den Bericht zur Kenntnis. Und die Warnung? – Ebenfalls <TARGET>zur</TARGET> <TARGET>Kenntnis</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The support verb is absent from this elliptic occurrence, so the route cannot construct a feature-bearing Collocation Surface without borrowing grammar from another occurrence.",
			contaminationKeys: [
				"de-coll-boundary:ellipsis",
				"de-coll-lemma:kenntnis-nehmen",
			],
		},
		"grammar-de-coll-unresolved-present-member-unmarked": {
			input: {
				markedContext:
					"Sie <TARGET>stellt</TARGET> einen <TARGET>Antrag</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The canonical member einen is present but unmarked; underselection cannot be reclassified as a Partial Surface.",
			contaminationKeys: [
				"de-coll-boundary:present-member-unmarked",
				"de-coll-lemma:antrag-stellen",
			],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
