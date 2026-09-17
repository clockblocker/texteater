import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/PROPN"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/proper-noun",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-propn-demo-person-maria",
		"grammar-de-propn-demo-place-berlin",
		"grammar-de-propn-demo-multi-angela-merkel",
		"grammar-de-propn-demo-genitive-hans",
		"grammar-de-propn-demo-acronym-nato",
		"grammar-de-propn-demo-typo-koelnn",
		"grammar-de-propn-demo-citation-work-tonio-kroeger",
		"grammar-de-propn-demo-org-unesco",
		"grammar-de-propn-demo-vocative-clara",
		"grammar-de-propn-demo-stylized-ebay",
		"grammar-de-propn-demo-org-rotes-kreuz",
		"grammar-de-propn-demo-work-physiker",
		"grammar-de-propn-demo-integrated-lego",
	],
	source: import.meta.url,
});
