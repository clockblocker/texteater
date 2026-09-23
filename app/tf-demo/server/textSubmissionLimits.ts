// TODO: https://github.com/clockblocker/texteater/issues/510
// These three limits were picked together as a Convex audit stopgap and are
// not coherent with each other; the sentence count is decided by the splitter,
// not the user. See the issue before changing any of them.
export const MAX_SOURCE_TEXT_CHARACTERS = 10_000;
export const MAX_SOURCE_SENTENCES = 25;
export const MAX_SOURCE_SENTENCE_CHARACTERS = 2_000;

function exceedsCharacterLimit(value: string, limit: number): boolean {
	let count = 0;
	for (const _character of value) {
		count += 1;
		if (count > limit) return true;
	}
	return false;
}

/**
 * The reason provider-bound text exceeds a submission limit, or `undefined`
 * when it is within every limit.
 */
export function textSubmissionLimitViolation(
	sourceText: string,
	sourceSentences: readonly string[],
): string | undefined {
	if (exceedsCharacterLimit(sourceText, MAX_SOURCE_TEXT_CHARACTERS))
		return `Source text is limited to ${MAX_SOURCE_TEXT_CHARACTERS} characters.`;
	if (sourceSentences.length > MAX_SOURCE_SENTENCES)
		return `At most ${MAX_SOURCE_SENTENCES} sentences are allowed.`;
	for (const sentence of sourceSentences) {
		if (exceedsCharacterLimit(sentence, MAX_SOURCE_SENTENCE_CHARACTERS))
			return `Each sentence is limited to ${MAX_SOURCE_SENTENCE_CHARACTERS} characters.`;
	}
	return undefined;
}

/** Reject provider-bound text before any model or persistence work begins. */
export function assertTextSubmissionWithinLimits(
	sourceText: string,
	sourceSentences: readonly string[],
): void {
	const violation = textSubmissionLimitViolation(sourceText, sourceSentences);
	if (violation !== undefined) throw new Error(violation);
}
