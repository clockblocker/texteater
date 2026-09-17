import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/ADV"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/adverb",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-adv-demo-temporal-heute",
		"grammar-de-adv-demo-demonstrative-dazu",
		"grammar-de-adv-demo-interrogative-warum",
		"grammar-de-adv-demo-comparative-lieber",
		"grammar-de-adv-demo-superlative-am-liebsten",
		"grammar-de-adv-demo-typo-gester",
		"grammar-de-adv-demo-einerseits-andererseits",
	],
	source: import.meta.url,
});
