import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Phraseme/Proverb"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/phraseme/proverb",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-proverb-demo-morgenstund-attribution",
		"grammar-de-proverb-demo-aller-anfang-typo",
		"grammar-de-proverb-demo-was-heute-punctuation",
		"grammar-de-proverb-demo-grube-partial",
		"grammar-de-proverb-demo-muss-historical-variant",
		"grammar-de-proverb-demo-wo-gehobelt-discontinuous",
	],
	source: import.meta.url,
});
