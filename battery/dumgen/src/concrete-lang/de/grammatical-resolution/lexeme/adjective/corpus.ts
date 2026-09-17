import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/ADJ"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/adjective",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-adj-demo-citation-sanft",
		"grammar-de-adj-demo-attributive-klein",
		"grammar-de-adj-demo-adverbial-schnell",
		"grammar-de-adj-demo-comparative-besser",
		"grammar-de-adj-demo-ordinal-erste",
		"grammar-de-adj-demo-typo-freundlcih",
	],
	source: import.meta.url,
});
