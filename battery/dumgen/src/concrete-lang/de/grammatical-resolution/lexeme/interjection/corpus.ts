import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/INTJ"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/interjection",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-intj-demo-pfui-expressive",
		"grammar-de-intj-demo-ja-response",
		"grammar-de-intj-demo-hmm-lengthened",
		"grammar-de-intj-demo-ha-ha-reduplication",
		"grammar-de-intj-demo-typo-huraa",
		"grammar-de-intj-demo-archaic-juchhei",
		"grammar-de-intj-demo-contextual-ach-after-noun",
	],
	source: import.meta.url,
});
