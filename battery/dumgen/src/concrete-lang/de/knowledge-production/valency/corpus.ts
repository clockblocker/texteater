import { z } from "zod";
import { readingSchema } from "../../../../generated/schemas.js";
import { defineLinguisticCorpus } from "../../authoring.js";
import { valencySlotDraftSchema } from "../../model-schemas.js";
import data from "./source-data.json";

/** The Knowledge call that creates a Reading, asked only for its Valency Frame. */
export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
	reading: readingSchema,
});
export const outputSchema = z.strictObject({
	valency: z.array(valencySlotDraftSchema),
});
export const corpusSource = defineLinguisticCorpus({
	route: data.route,
	inputSchema,
	outputSchema,
	cases: data.cases,
	demonstrationIds: data.demonstrationIds,
	source: import.meta.url,
});
