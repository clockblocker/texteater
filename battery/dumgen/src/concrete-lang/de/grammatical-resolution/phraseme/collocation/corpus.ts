import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Phraseme/Collocation"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/phraseme/collocation",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-coll-decision-present-full",
		"grammar-de-coll-frage-citation",
		"grammar-de-coll-verfuegung-present-full",
		"grammar-de-coll-anerkennung-participle-typo-full",
		"grammar-de-coll-unresolved-free-book-read",
	],
	source: import.meta.url,
});
