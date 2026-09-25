import { defineLinguisticCorpus } from "../authoring.js";
import { demonstrationIds, sentenceCases, sentenceRoute } from "./cases.js";
import { inputSchema, goldSchema as outputSchema } from "./experiment.js";

export { inputSchema, outputSchema };

/** The offset-keyed sentence corpus, registered like every other route for listing and contamination checks. */
export const corpusSource = defineLinguisticCorpus({
	route: sentenceRoute,
	inputSchema,
	outputSchema,
	cases: sentenceCases,
	demonstrationIds,
	source: import.meta.url,
});
