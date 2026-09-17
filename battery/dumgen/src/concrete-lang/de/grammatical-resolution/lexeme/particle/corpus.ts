import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/PART"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/particle",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-part-demo-negative-nicht",
		"grammar-de-part-demo-infinitival-zu",
		"grammar-de-part-demo-modal-halt",
		"grammar-de-part-demo-focus-sogar",
		"grammar-de-part-demo-typo-ebn",
		"grammar-de-part-demo-archaic-nit",
		"grammar-de-part-demo-distinct-archaic-ni",
		"grammar-de-part-demo-foreign-yes",
		"grammar-de-part-demo-abbreviation-aff",
	],
	source: import.meta.url,
});
