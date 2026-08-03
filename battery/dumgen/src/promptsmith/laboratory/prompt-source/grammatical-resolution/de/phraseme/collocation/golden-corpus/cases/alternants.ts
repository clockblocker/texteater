import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { unresolved } from "./builders";

export const alternantCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-coll-determiner-alternant": {
			input: {
				markedContext:
					"Der Ausschuss <TARGET>trifft</TARGET> <TARGET>die</TARGET> <TARGET>Entscheidung</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"Replacing canonical eine with die changes a lexical member; this route does not equate the resulting combination with eine Entscheidung treffen.",
			contaminationKeys: [
				"de-coll-lemma:entscheidung-treffen",
				"de-coll-member-identity:determiner-alternant",
			],
		},
		"grammar-de-coll-plural-member-alternant": {
			input: {
				markedContext:
					"Die Ausschüsse <TARGET>treffen</TARGET> <TARGET>Entscheidungen</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The bare plural nominal differs from the canonical article-plus-singular member sequence, and the verbal feature bundle cannot represent that nominal contrast.",
			contaminationKeys: [
				"de-coll-lemma:entscheidung-treffen",
				"de-coll-member-identity:plural-alternant",
			],
		},
		"grammar-de-coll-support-verb-alternant": {
			input: {
				markedContext:
					"Der Ausschuss <TARGET>fällt</TARGET> <TARGET>eine</TARGET> <TARGET>Entscheidung</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"Fällen replaces the canonical support verb treffen; this route does not collapse the two conventional combinations into one Lemma.",
			contaminationKeys: [
				"de-coll-lemma:entscheidung-treffen",
				"de-coll-member-identity:support-verb-alternant",
			],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
