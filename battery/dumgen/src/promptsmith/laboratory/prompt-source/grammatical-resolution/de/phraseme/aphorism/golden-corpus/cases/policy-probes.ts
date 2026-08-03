import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { markEveryMember, unresolved } from "./builders";

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-aphorism-provisional-anonymous-maxim": {
			...unresolved(`${markEveryMember("Leben und leben lassen")}.`),
			explanation:
				"Corpus-only conservative probe: without authorship or collection evidence, the maxim-like saying is not promoted from Proverb or saying to Aphorism.",
		},
		"grammar-de-aphorism-provisional-targeted-attribution": {
			...unresolved(
				`${markEveryMember("Die meisten Nachahmer lockt das Unnachahmliche Marie von Ebner Eschenbach")}.`,
			),
			explanation:
				"An attribution is metadata, not a lexical member of the Aphorism Lemma; including it makes the target overbroad.",
		},
		"grammar-de-aphorism-provisional-targeted-punctuation": {
			...unresolved(
				"<TARGET>Alt</TARGET> <TARGET>werden</TARGET><TARGET>,</TARGET> <TARGET>heißt</TARGET> <TARGET>sehend</TARGET> <TARGET>werden</TARGET>.",
			),
			explanation:
				"Punctuation is not ResolvableText and cannot be a Phraseme member; the comma must remain outside TARGET markup.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
