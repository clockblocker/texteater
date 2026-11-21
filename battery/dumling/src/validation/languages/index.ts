import type { Language } from "../../types.js";
import { deValidationOperations } from "./de/semantics.js";
import { enValidationOperations } from "./en/semantics.js";
import { heValidationOperations } from "./he/semantics.js";
import type { ValidationOperationEntry } from "./types.js";

/**
 * Per-language validation operations, indexed by `Language`.
 * Adding a new language requires registering its operations table here.
 */
export const languageValidationOperations = {
	de: deValidationOperations,
	en: enValidationOperations,
	he: heValidationOperations,
} as const satisfies Record<Language, readonly ValidationOperationEntry[]>;
