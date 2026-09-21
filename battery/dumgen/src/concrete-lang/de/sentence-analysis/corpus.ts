import { defineLinguisticCorpus } from "../authoring.js";
import { inputSchema, goldSchema as outputSchema } from "./experiment.js";
import data from "./source-data.json";

export { inputSchema, outputSchema };

/** The offset-keyed sentence corpus, registered like every other route for listing and contamination checks. */
export const corpusSource = defineLinguisticCorpus({
	route: data.route,
	inputSchema,
	outputSchema,
	cases: data.cases,
	demonstrationIds: data.demonstrationIds,
	source: import.meta.url,
});
