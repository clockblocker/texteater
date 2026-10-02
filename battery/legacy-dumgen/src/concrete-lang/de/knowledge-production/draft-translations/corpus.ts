import { z } from "zod";
import { lemmaSchema } from "../../../../generated/schemas.js";
import { defineLinguisticCorpus } from "../../authoring.js";
import data from "./source-data.json";

/** Drafts run before the Reading exists, so the input carries the Lemma only. */
export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
	lemma: lemmaSchema,
	request: z.strictObject({
		translations: z.strictObject({ en: z.null(), ru: z.null() }).partial(),
	}),
});
export const outputSchema = z.strictObject({
	translations: z
		.strictObject({
			en: z.string().min(1).nullable(),
			ru: z.string().min(1).nullable(),
		})
		.partial(),
});
export const corpusSource = defineLinguisticCorpus({
	route: data.route,
	inputSchema,
	outputSchema,
	cases: data.cases,
	demonstrationIds: data.demonstrationIds,
	source: import.meta.url,
});
