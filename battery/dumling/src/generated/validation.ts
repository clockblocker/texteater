// Generated from canonical Zod schemas. Run bun run generate.
import { mergeEncodedValidationArtifacts } from "../validation/merge-artifacts.js";
import { encodedValidation as deEncodedValidation } from "./languages/de/validation.js";
import { encodedValidation as enEncodedValidation } from "./languages/en/validation.js";
import { encodedValidation as heEncodedValidation } from "./languages/he/validation.js";
export const encodedValidation: string = mergeEncodedValidationArtifacts([
	["de", deEncodedValidation],
	["en", enEncodedValidation],
	["he", heEncodedValidation],
]);
