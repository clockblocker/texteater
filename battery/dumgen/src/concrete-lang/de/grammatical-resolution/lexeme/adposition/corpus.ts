import { z } from "zod";
import projected from "../../../../../generated/grammar-cases/lexeme/adposition.json";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/ADP"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/adposition",
	inputSchema,
	outputSchema,
	cases: projected.cases,
	demonstrationIds: projected.demonstrationIds,
	source: import.meta.url,
});
export const { evaluationCaseIds, slices, origins } = projected;
