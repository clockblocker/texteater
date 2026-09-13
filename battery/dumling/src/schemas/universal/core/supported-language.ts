import { z } from "zod";

const EN = z.literal("en");
const DE = z.literal("de");
const HE = z.literal("he");

export const SupportedLanguageSchema = z.enum([EN.value, DE.value, HE.value]);
export const SupportedLanguage = SupportedLanguageSchema.enum;
export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;
