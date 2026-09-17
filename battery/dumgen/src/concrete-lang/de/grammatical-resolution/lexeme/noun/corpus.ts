import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/NOUN"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/noun",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-noun-demo-shared-abstieg",
		"grammar-de-noun-demo-owned-aufstieg",
		"grammar-de-noun-demo-citation-haus",
		"grammar-de-noun-demo-acc-sing-hund",
		"grammar-de-noun-demo-dat-plur-kindern",
		"grammar-de-noun-demo-typo-kaffe",
		"grammar-de-noun-demo-archaic-antlitz",
		"grammar-de-noun-demo-suspended-kinderbuecher",
	],
	source: import.meta.url,
});
