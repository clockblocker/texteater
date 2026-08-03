import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { markEveryMember, unresolved } from "./builders";

export const authorshipBoundaryCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-aphorism-authorship-anonymous-maxim": {
				...unresolved(`${markEveryMember("Leben und leben lassen")}.`),
				explanation:
					"Without authorship or collection evidence, the maxim-like saying is not promoted from Proverb or saying to Aphorism.",
			},
			"grammar-de-aphorism-authorship-overbroad-attribution": {
				...unresolved(
					`${markEveryMember("Die meisten Nachahmer lockt das Unnachahmliche Marie von Ebner Eschenbach")}.`,
				),
				explanation:
					"An attribution is metadata, not a lexical member of the Aphorism Lemma; including it makes the target overbroad.",
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
