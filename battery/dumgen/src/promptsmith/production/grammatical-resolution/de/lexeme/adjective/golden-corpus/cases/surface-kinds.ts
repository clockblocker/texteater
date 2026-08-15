import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citationCase } from "./builders";

export const surfaceKindCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adj-demo-citation-sanft": citationCase(
			"Im Wörterbuch steht das Adjektiv <TARGET>sanft</TARGET>.",
			"sanft",
			"sanft",
			{
				explanation:
					"Dictionary mention. Citation Surface. No inflection bag.",
			},
		),
		"grammar-de-adj-accept-citation-mild": citationCase(
			"Als Grundform wird <TARGET>mild</TARGET> angegeben.",
			"mild",
			"mild",
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
