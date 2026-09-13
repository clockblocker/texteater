import { defineLinguisticPrompt } from "../../authoring.js";
import {
	emojiInputSchema as inputSchema,
	emojiOutputSchema as outputSchema,
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
