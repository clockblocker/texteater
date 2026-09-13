import type { SupportedLanguage } from "../../../types/public-types.js";
import type { LanguageApi } from "../../api-shape.js";
import { extractLemma } from "../entity-accessors.js";

export function buildExtractOperations<
	L extends SupportedLanguage,
>(): LanguageApi<L>["extract"] {
	return {
		lemma: extractLemma as LanguageApi<L>["extract"]["lemma"],
	};
}
