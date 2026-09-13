import { defineLinguisticPrompt } from "../../../authoring.js";
import {
	morphologicalSegmentationInputSchema as inputSchema,
	morphologicalSegmentationOutputSchema as outputSchema,
} from "../../structured-schemas.js";
import data from "./source-data.json";

export { inputSchema, outputSchema };
export const promptSource = defineLinguisticPrompt({
	...data,
	inputSchema,
	outputSchema,
	source: import.meta.url,
});
