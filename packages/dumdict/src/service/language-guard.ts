import { inspectId, type SupportedLanguage } from "../dumling";
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

export function assertDumlingIdLanguageMatches<L extends SupportedLanguage>(
	expectedLanguage: L,
	id: string,
) {
	assertLanguageMatches(expectedLanguage, inspectId(id)?.language);
}
