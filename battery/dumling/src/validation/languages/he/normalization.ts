import { normalizeForm } from "../../semantics.js";
import type { LanguageNormalization } from "../types.js";

/**
 * Hebrew case-folding and Canonical Form key hooks. Hebrew has no letter case
 * and folds to itself; any future script-specific folding (such as diacritics)
 * lives here rather than in shared identity code.
 */
export const heNormalization: LanguageNormalization = {
	foldCase: (value) => value.toLocaleLowerCase("he"),
	canonicalFormKey: (value) => normalizeForm(value).toLocaleLowerCase("he"),
};
