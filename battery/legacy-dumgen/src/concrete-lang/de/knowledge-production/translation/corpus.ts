import { defineLinguisticCorpus } from "../../authoring.js";
import {
	translationAnalysisInputSchema as inputSchema,
	translationAnalysisOutputSchema as outputSchema,
} from "../structured-schemas.js";
import data from "./source-data.json";

export { inputSchema, outputSchema };
export const corpusSource = defineLinguisticCorpus({
	...data,
	inputSchema,
	outputSchema,
	source: import.meta.url,
});
