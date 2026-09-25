import { z } from "zod";
import projected from "../../../../../generated/grammar-cases/phraseme/collocation.json";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Phraseme/Collocation"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/phraseme/collocation",
	inputSchema,
	outputSchema,
	cases: projected.cases,
	demonstrationIds: projected.demonstrationIds,
	source: import.meta.url,
});
// Alternants share a Lemma contamination key with the production demonstration.
// They remain canonical regression cases, but cannot be scored as held-out evidence.
export const { evaluationCaseIds, slices } = projected;
