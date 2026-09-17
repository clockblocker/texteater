import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Phraseme/Aphorism"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/phraseme/aphorism",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-aphorism-alt-werden",
		"grammar-de-aphorism-typo-hoert",
		"grammar-de-aphorism-historical-muss",
		"grammar-de-aphorism-vertrauen-discontinuous",
		"grammar-de-aphorism-verstehen-partial",
		"grammar-de-aphorism-liebe-rechte",
	],
	source: import.meta.url,
});
