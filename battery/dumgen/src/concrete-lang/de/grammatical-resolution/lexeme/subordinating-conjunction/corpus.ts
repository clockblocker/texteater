import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/SCONJ"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/subordinating-conjunction",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-sconj-demo-finite-weil",
		"grammar-de-sconj-demo-reduced-wie",
		"grammar-de-sconj-demo-infinitival-um",
		"grammar-de-sconj-demo-causal-da",
		"grammar-de-sconj-demo-typo-obwol",
		"grammar-de-sconj-demo-historical-dass",
		"grammar-de-sconj-demo-multiword-so-dass",
		"grammar-de-sconj-demo-anstatt-zu",
		"grammar-de-sconj-demo-discontinuous-so-dass",
	],
	source: import.meta.url,
});
