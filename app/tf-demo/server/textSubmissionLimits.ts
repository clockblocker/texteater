/**
 * Submission limits, each protecting one stated thing (#1191, #510).
 *
 * A pasted text is segmented in full by one action as it is submitted, so
 * its limits bound that action's model calls. A `.txt` file is stored
 * unprocessed and processed later (#1193), so its limits bound only
 * storage: the file (`shared/text-file-limits.ts`, which the browser checks
 * too), each Scroll's document, and what the reader reads.
 */

// TODO: https://github.com/clockblocker/texteater/issues/510
// The paste limits were picked together as a Convex audit stopgap; the
// sentence count is decided by the splitter, not the user. See the issue
// before changing any of them.
/** Paste: bounds the model work one synchronous submission may start. */
export const MAX_SOURCE_TEXT_CHARACTERS = 10_000;
/** Paste: bounds the Sentences a paste re-reads when it is submitted again. */
export const MAX_SOURCE_SENTENCES = 25;
/** Paste: bounds one Sentence's segmentation questions, which grow quadratically. */
const MAX_SOURCE_SENTENCE_CHARACTERS = 2_000;

/**
 * One Scroll's stored text, its running text and its Extracted Text
 * together, as UTF-8: Convex stores a document of at most 1 MiB, and the
 * Scroll's other fields fit in the rest.
 */
export const MAX_SCROLL_TEXT_BYTES = 900 * 1024;

/**
 * The Sentences one Scroll may hold: the reader reads a Scroll's
 * Sentences in one query, inside Convex's read limits. The longest
 * Gutenberg chapters seen hold about 650.
 */
export const MAX_SENTENCES_PER_SCROLL = 2_000;

/**
 * The Sections one file may open: they are all written in one mutation,
 * far inside Convex's 16,000 documents per mutation. The Bible opens 67.
 */
export const MAX_SECTIONS_PER_FILE = 2_000;

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
