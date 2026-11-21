import type { Language } from "../../types.js";
import { deNormalization } from "./de/normalization.js";
import { enNormalization } from "./en/normalization.js";
import { heNormalization } from "./he/normalization.js";
import type { LanguageNormalization } from "./types.js";

/**
 * Per-language normalization and key-folding hooks, indexed by `Language`.
 * Adding a new language requires declaring its normalization hook here.
 */
export const languageNormalizations = {
	de: deNormalization,
	en: enNormalization,
	he: heNormalization,
} as const satisfies Record<Language, LanguageNormalization>;
