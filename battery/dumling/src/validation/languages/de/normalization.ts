import { normalizeForm } from "../../semantics.js";
import type { LanguageNormalization } from "../types.js";

/** German case-folding and Canonical Form key hooks. */
export const deNormalization: LanguageNormalization = {
	foldCase: (value) => value.toLocaleLowerCase("de"),
	canonicalFormKey: (value) => normalizeForm(value).toLocaleLowerCase("de"),
};
