import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/NUM"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/numeral",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-num-demo-word-vier",
		"grammar-de-num-demo-digit-7",
		"grammar-de-num-demo-fraction-eineinhalb",
		"grammar-de-num-demo-range-zehn-bis-zwoelf",
		"grammar-de-num-demo-inflected-millionen",
		"grammar-de-num-demo-initial-inflected-trillionen",
		"grammar-de-num-demo-typo-dreii",
	],
	source: import.meta.url,
});
