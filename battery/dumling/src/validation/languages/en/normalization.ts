import { normalizeForm } from "../../semantics.js";
import type { LanguageNormalization } from "../types.js";

/** English case-folding and Canonical Form key hooks. */
export const enNormalization: LanguageNormalization = {
	foldCase: (value) => value.toLocaleLowerCase("en"),
	canonicalFormKey: (value) => normalizeForm(value).toLocaleLowerCase("en"),
};
