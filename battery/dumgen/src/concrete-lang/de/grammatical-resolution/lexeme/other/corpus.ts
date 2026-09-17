import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/X"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/other",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-x-demo-unknown-citation-zorp",
		"grammar-de-x-demo-foreign-whatever",
		"grammar-de-x-demo-inflection-glorp-dat",
		"grammar-de-x-demo-typo-watevr",
		"grammar-de-x-demo-abbr-idk",
		"grammar-de-x-demo-fragment-unver",
		"grammar-de-x-demo-inflection-nerpa-acc",
		"grammar-de-x-demo-inflection-plerke-sub",
	],
	source: import.meta.url,
});
