import { defineLinguisticPrompt } from "../../../authoring.js";
import {
	lexicalSegmentationInputSchema as inputSchema,
	lexicalSegmentationOutputSchema as outputSchema,
} from "../../structured-schemas.js";
import data from "./source-data.json";

export { inputSchema, outputSchema };
export const promptSource = defineLinguisticPrompt({
	...data,
	inputSchema,
	outputSchema,
	source: import.meta.url,
});
