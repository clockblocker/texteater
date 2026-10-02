import { z } from "zod";
import projected from "../../../../../generated/grammar-cases/lexeme/determiner.json";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticCorpus,
	foreignGrammarAnswerSchema,
	grammarInputSchema,
} from "../../../authoring.js";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/DET"],
	z.strictObject({ decision: z.literal("Unresolved") }),
	foreignGrammarAnswerSchema,
]);
export const corpusSource = defineLinguisticCorpus({
	route: "grammatical-resolution/de/lexeme/determiner",
	inputSchema,
	outputSchema,
	cases: projected.cases,
	demonstrationIds: projected.demonstrationIds,
	source: import.meta.url,
});
export const { evaluationCaseIds, slices, origins } = projected;
