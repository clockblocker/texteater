import { defineLinguisticPrompt } from "../../../authoring.js";
import {
	morphologicalResolutionInputSchema as inputSchema,
	morphologicalResolutionOutputSchema as outputSchema,
} from "../../structured-schemas.js";
import data from "./source-data.json";

export { inputSchema, outputSchema };
export const promptSource = defineLinguisticPrompt({
	...data,
	inputSchema,
	outputSchema,
	source: import.meta.url,
});
