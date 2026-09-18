import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/VERB"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/verb",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-verb-demo-exists",
		"grammar-de-verb-demo-weather",
		"grammar-de-verb-citation-arbeiten",
		"grammar-de-verb-separable-imperative-aufpassen",
		"grammar-de-verb-dw-future-beteiligen",
		"grammar-de-verb-dw-separable-aufsetzen",
		"grammar-de-verb-dw-modal-passive-hergestellt",
		"grammar-de-verb-dw-perfect-passive-aufgefunden",
	],
	source: import.meta.url,
});
