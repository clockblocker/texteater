import { z } from "zod";

export const SupportedLanguageSchema = z.enum(["en", "de", "he"]);
