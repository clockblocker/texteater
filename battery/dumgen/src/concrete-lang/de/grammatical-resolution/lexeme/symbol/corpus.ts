import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/SYM"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/symbol",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-sym-demo-percent-unit",
		"grammar-de-sym-demo-times-nominal",
		"grammar-de-sym-demo-euro-currency",
		"grammar-de-sym-demo-section-dative",
		"grammar-de-sym-demo-equals-genitive",
		"grammar-de-sym-demo-feminine-hash",
		"grammar-de-sym-demo-foreign-arabic-percent",
		"grammar-de-sym-demo-card-number-sign",
		"grammar-de-sym-demo-range-dash",
		"grammar-de-sym-demo-variant-fullwidth-plus",
		"grammar-de-sym-demo-typo-ocr-euro",
		"grammar-de-sym-demo-sections-plural",
	],
	source: import.meta.url,
});
