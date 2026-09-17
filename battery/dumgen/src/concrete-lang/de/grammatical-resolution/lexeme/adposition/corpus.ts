import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/ADP"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/adposition",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-adp-demo-prep-mit-dat",
		"grammar-de-adp-demo-two-way-auf",
		"grammar-de-adp-demo-post-entlang-acc",
		"grammar-de-adp-demo-circ-von-an",
		"grammar-de-adp-demo-typo-one",
		"grammar-de-adp-demo-archaic-ob",
	],
	source: import.meta.url,
});
