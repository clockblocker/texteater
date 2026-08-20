import type { SupportedLanguage } from "dumling/types";
import { DumdictLanguageMismatchError } from "../public";

export function assertLanguageMatches<L extends SupportedLanguage>(
	expectedLanguage: L,
	actualLanguage: SupportedLanguage | undefined,
) {
	if (actualLanguage !== expectedLanguage) {
		throw new DumdictLanguageMismatchError({
			expectedLanguage,
			actualLanguage,
		});
	}
}
