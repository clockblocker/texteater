import { z } from "zod";

const PHRASEME = z.literal("Phraseme");
const LEXEME = z.literal("Lexeme");
const MORPHEME = z.literal("Morpheme");

export const LemmaFamilySchema = z.enum([
	PHRASEME.value,
	LEXEME.value,
	MORPHEME.value,
]);
export const LemmaFamily = LemmaFamilySchema.enum;
export type LemmaFamily = z.infer<typeof LemmaFamilySchema>;
