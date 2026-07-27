import type { LanguageApi, SupportedLanguage } from "../../types/public-types";
import { extractLemma } from "./entity-accessors";

export function buildExtractOperations<
	L extends SupportedLanguage,
>(): LanguageApi<L>["extract"] {
	return {
		lemma: extractLemma as unknown as LanguageApi<L>["extract"]["lemma"],
	};
}
