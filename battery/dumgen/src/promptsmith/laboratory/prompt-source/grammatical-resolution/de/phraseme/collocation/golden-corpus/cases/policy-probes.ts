import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { unresolved } from "./builders";

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-coll-provisional-determiner-alternant": {
			input: {
				markedContext:
					"Der Ausschuss <TARGET>trifft</TARGET> <TARGET>die</TARGET> <TARGET>Entscheidung</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only identity probe: policy has not decided whether replacing canonical eine with die remains one Collocation Lemma.",
			contaminationKeys: [
				"de-coll-lemma:entscheidung-treffen",
				"de-coll-policy:determiner-alternant",
			],
		},
		"grammar-de-coll-provisional-plural-alternant": {
			input: {
				markedContext:
					"Die Ausschüsse <TARGET>treffen</TARGET> <TARGET>Entscheidungen</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only identity probe: the current verbal feature schema cannot record the nominal plural contrast, and its Lemma identity is unsettled.",
			contaminationKeys: [
				"de-coll-lemma:entscheidung-treffen",
				"de-coll-policy:plural-alternant",
			],
		},
		"grammar-de-coll-provisional-support-verb-alternant": {
			input: {
				markedContext:
					"Der Ausschuss <TARGET>fällt</TARGET> <TARGET>eine</TARGET> <TARGET>Entscheidung</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only identity probe: policy has not decided whether treffen and fällen name one Collocation Lemma or separate conventional combinations.",
			contaminationKeys: [
				"de-coll-lemma:entscheidung-treffen",
				"de-coll-policy:support-verb-alternant",
			],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
