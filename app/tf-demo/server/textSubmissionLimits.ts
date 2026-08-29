export const MAX_SOURCE_TEXT_CHARACTERS = 10_000;
export const MAX_SOURCE_SENTENCES = 9;
export const MAX_SOURCE_SENTENCE_CHARACTERS = 2_000;

function exceedsCharacterLimit(value: string, limit: number): boolean {
	let count = 0;
	for (const _character of value) {
		count += 1;
		if (count > limit) return true;
	}
	return false;
}

/** Reject provider-bound text before any model or persistence work begins. */
export function assertTextSubmissionWithinLimits(
	sourceText: string,
	sourceSentences: readonly string[],
): void {
	if (exceedsCharacterLimit(sourceText, MAX_SOURCE_TEXT_CHARACTERS)) {
		throw new Error(
			`Source text is limited to ${MAX_SOURCE_TEXT_CHARACTERS} characters.`,
		);
	}
	if (sourceSentences.length > MAX_SOURCE_SENTENCES) {
		throw new Error(
			`At most ${MAX_SOURCE_SENTENCES} sentences are allowed.`,
		);
	}
	for (const sentence of sourceSentences) {
		if (exceedsCharacterLimit(sentence, MAX_SOURCE_SENTENCE_CHARACTERS)) {
			throw new Error(
				`Each sentence is limited to ${MAX_SOURCE_SENTENCE_CHARACTERS} characters.`,
			);
		}
	}
}
