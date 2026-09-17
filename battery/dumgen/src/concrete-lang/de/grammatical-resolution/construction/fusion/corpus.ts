import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Construction/Fusion"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/construction/fusion",
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds: [
		"grammar-de-fusion-demo-im-initial",
		"grammar-de-fusion-demo-zur-noun-control",
		"grammar-de-fusion-demo-zum-typo",
		"grammar-de-fusion-demo-fuers-historical-variant",
		"grammar-de-fusion-demo-am-near-route-controls",
		"grammar-de-fusion-demo-ins-near-idiom-and-dialect",
	],
	source: import.meta.url,
});
