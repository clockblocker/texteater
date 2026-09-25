import { z } from "zod";
import projected from "../../../../../generated/grammar-cases/lexeme/auxiliary.json";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	grammarInputSchema,
} from "../../../authoring.js";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/AUX"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/auxiliary",
	inputSchema,
	outputSchema,
	cases: projected.cases,
	demonstrationIds: projected.demonstrationIds,
	source: import.meta.url,
});
export const { evaluationCaseIds, slices, origins } = projected;
