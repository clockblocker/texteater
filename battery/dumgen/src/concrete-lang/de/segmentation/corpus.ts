import { defineLinguisticCorpus } from "../authoring.js";
import {
	intakeInputSchema as inputSchema,
	intakeOutputSchema as outputSchema,
} from "../model-schemas.js";
import data from "./source-data.json";

export { inputSchema, outputSchema };
export const corpusSource = defineLinguisticCorpus({
	route: data.route,
	inputSchema,
	outputSchema,
	cases: data.cases,
	demonstrationIds: data.demonstrationIds,
	source: import.meta.url,
});
