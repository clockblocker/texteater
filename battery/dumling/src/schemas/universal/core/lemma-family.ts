import { z } from "zod";

const LEXEME = z.literal("Lexeme");
const LOCUTION = z.literal("Locution");
const SAYING = z.literal("Saying");
const MORPHEME = z.literal("Morpheme");
const FOREIGN = z.literal("Foreign");

/**
 * A route is language, Family and Kind (ADR 0039). A Kind may repeat across
 * Families (Lexeme VERB, Locution VERB), so the Kind alone never names the
 * Family.
 */
export const LemmaFamilySchema = z.enum([
	LEXEME.value,
	LOCUTION.value,
	SAYING.value,
	MORPHEME.value,
	FOREIGN.value,
]);
export const LemmaFamily = LemmaFamilySchema.enum;
export type LemmaFamily = z.infer<typeof LemmaFamilySchema>;
