/**
 * Lean canonical ID codec constructor. Callers provide their own lightweight
 * language parser, keeping schema graphs and Dumling's parser artifact out of
 * this entrypoint.
 */
export { readingFingerprint } from "./operations/reading-fingerprint.js";
export { buildIdOperations } from "./operations/shared/id/id.js";
export { buildLanguageApiFromParseOperations } from "./operations/shared/language-api.js";
export { supportedLanguages } from "./operations/shared/language-inventory.js";
export { canonicalizeNullableProperties } from "./operations/shared/parse/canonicalize-nullable.js";
export type {
	Reading,
	ReadingFingerprint,
} from "./types/public-types.js";
