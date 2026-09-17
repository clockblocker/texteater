import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/DET"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/determiner",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-det-demo-definite-article-der",
		"grammar-de-det-demo-possessive-meinem",
		"grammar-de-det-demo-feminine-article-die",
		"grammar-de-det-demo-neuter-article-das",
		"grammar-de-det-demo-uninflected-derlei",
		"grammar-de-det-demo-variant-ne",
		"grammar-de-det-demo-standalone-jener",
		"grammar-de-det-demo-paradigm-welche",
		"grammar-de-det-demo-paradigm-manchem",
		"grammar-de-det-demo-quoted-archaic-etwelche",
	],
	source: import.meta.url,
});
