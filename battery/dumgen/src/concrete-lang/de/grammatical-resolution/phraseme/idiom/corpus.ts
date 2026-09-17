import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Phraseme/Idiom"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/phraseme/idiom",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-idiom-flinte-past-full",
		"grammar-de-idiom-grass-citation",
		"grammar-de-idiom-woelfe-present-full",
		"grammar-de-idiom-teufel-wand-full",
		"grammar-de-idiom-nase-typo-full",
		"grammar-de-idiom-handtuch-ellipsis-partial",
	],
	source: import.meta.url,
});
