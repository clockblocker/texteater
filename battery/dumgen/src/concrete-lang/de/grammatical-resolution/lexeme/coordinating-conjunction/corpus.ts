import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/CCONJ"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/coordinating-conjunction",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-cconj-demo-ordinary-und",
		"grammar-de-cconj-demo-comparative-als",
		"grammar-de-cconj-demo-causal-denn",
		"grammar-de-cconj-demo-typo-udn",
		"grammar-de-cconj-demo-variant-bzw",
		"grammar-de-cconj-demo-archaic-allein",
		"grammar-de-cconj-demo-sowohl-als-auch",
		"grammar-de-cconj-demo-je-desto",
		"grammar-de-cconj-demo-entweder-typo",
	],
	source: import.meta.url,
});
