import { z } from "zod";

export const targetLanguageSchema = z.enum(["de"]);

export type TargetLanguage = z.infer<typeof targetLanguageSchema>;
