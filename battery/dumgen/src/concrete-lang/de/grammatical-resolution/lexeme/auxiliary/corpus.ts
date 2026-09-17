import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/AUX"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/auxiliary",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-aux-demo-future-wird",
		"grammar-de-aux-demo-modal-kann",
		"grammar-de-aux-demo-copula-ist",
		"grammar-de-aux-demo-citation-duerfen",
		"grammar-de-aux-demo-imperative-sei",
		"grammar-de-aux-demo-typo-sol",
	],
	source: import.meta.url,
});
