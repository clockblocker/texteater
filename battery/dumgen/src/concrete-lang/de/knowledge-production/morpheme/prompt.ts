import { defineLinguisticPrompt } from "../../authoring.js";
import {
	knowledgeInputSchema as inputSchema,
	knowledgeOutputSchema as outputSchema,
} from "../../model-schemas.js";
import data from "./source-data.json";

export { inputSchema, outputSchema };
export const promptSource = defineLinguisticPrompt({
	route: data.route,
	inputSchema,
	outputSchema,
	body: data.body,
	cases: data.cases,
	demonstrationIds: data.demonstrationIds,
	source: import.meta.url,
});
