import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Phraseme/DiscourseFormula"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/phraseme/discourse-formula",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-discourse-formula-demo-guten-morgen",
		"grammar-de-discourse-formula-demo-es-tut-mir-leid-discontinuous",
		"grammar-de-discourse-formula-demo-vielen-dank-complement",
		"grammar-de-discourse-formula-demo-ach-du-meine-guete-vocative",
		"grammar-de-discourse-formula-demo-mfg-variant",
		"grammar-de-discourse-formula-demo-es-tut-mir-partial",
	],
	source: import.meta.url,
});
