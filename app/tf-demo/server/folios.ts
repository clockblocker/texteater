/**
 * Folios (#1193): Intake processes a book's Scroll Folio by Folio ahead of
 * the reader. A Folio is a run of whole Paragraphs of about
 * `FOLIO_CHARACTERS`, never splitting a Paragraph; a longer Paragraph is a
 * Folio alone. Inside a Folio, jev reads the stored Sentences in
 * `language.detect`'s windows of up to `WINDOW_SENTENCES`, and each window
 * is stored, or fails and is retried, on its own. Everything here is pure,
 * so the Convex isolate cuts Folios without loading Dumgen.
 */

/** About how many characters one Folio holds. */
const FOLIO_CHARACTERS = 3_000;

/** At most how many Sentences one `language.detect` window reads. */
const WINDOW_SENTENCES = 30;

/**
 * At most how many characters one window holds, a lone longer Sentence
 * aside. A Segment holds at least one character, so a window's Segments
 * stay inside the 16,000 documents one mutation (`folios.storeWindow`)
 * may write.
 */
const WINDOW_CHARACTERS = 15_000;

/**
 * How many Folios after the reader's own Intake processes before it stops
 * until the position moves. A tuning knob, not a decision.
 */
export const FOLIOS_AHEAD = 2;

/** A stored Sentence as the Folio cut reads it. */
type FolioSentence = {
	readonly position: number;
	/** Absent for a Sentence stored before paragraphs were kept: it is one alone. */
	readonly paragraph?: number;
	readonly stitchedText: string;
};

/** One Folio: the Sentence positions from `start` up to `end`, in `windows` windows. */
export type FolioCut = {
	readonly start: number;
	readonly end: number;
	readonly windows: number;
};

/**
 * A Scroll's Folios, in order, for its Sentences in position order. Each
 * Folio starts at a Paragraph's first Sentence and holds whole Paragraphs
 * up to about `characters`.
 */
export function cutFolios(
	sentences: readonly FolioSentence[],
	characters: number = FOLIO_CHARACTERS,
): FolioCut[] {
	/* each Folio's first index into `sentences` */
	const starts: number[] = [];
	let size = 0;
	let paragraphStart = 0;
	let paragraphSize = 0;
	const closeParagraph = () => {
		if (
			starts.length === 0 ||
			(size > 0 && size + paragraphSize > characters)
		) {
			starts.push(paragraphStart);
			size = 0;
		}
		size += paragraphSize;
	};
	for (const [index, sentence] of sentences.entries()) {
		const previous = sentences[index - 1];
		const sameParagraph =
			previous !== undefined &&
			sentence.paragraph !== undefined &&
			sentence.paragraph === previous.paragraph;
		if (previous !== undefined && !sameParagraph) closeParagraph();
		if (!sameParagraph) {
			paragraphStart = index;
			paragraphSize = 0;
		}
		paragraphSize += sentence.stitchedText.length + 1;
	}
	if (sentences.length > 0) closeParagraph();
	return starts.map((first, folio) => {
		const next = starts[folio + 1] ?? sentences.length;
		const last = sentences[next - 1];
		return {
			start: sentences[first]?.position ?? 0,
			end: (last?.position ?? 0) + 1,
			windows: windowsOf(sentences.slice(first, next)).length,
		};
	});
}

/**
 * A Folio's Sentences cut into consecutive windows of at most
 * `WINDOW_SENTENCES`, as even as they come, as `language.detect` cuts
 * them; a window over `WINDOW_CHARACTERS` is cut again where it would
 * pass them. The cut reads every stored Sentence of the Folio, so a
 * retried window holds the same Sentences.
 */
export function windowsOf<T extends { readonly stitchedText: string }>(
	sentences: readonly T[],
	size: number = WINDOW_SENTENCES,
	characters: number = WINDOW_CHARACTERS,
): T[][] {
	const count = Math.ceil(sentences.length / size);
	const each = Math.ceil(sentences.length / Math.max(count, 1));
	const windows: T[][] = [];
	for (let start = 0; start < sentences.length; start += each) {
		let window: T[] = [];
		let length = 0;
		for (const sentence of sentences.slice(start, start + each)) {
			const added = sentence.stitchedText.length;
			if (window.length > 0 && length + added > characters) {
				windows.push(window);
				window = [];
				length = 0;
			}
			window.push(sentence);
			length += added;
		}
		windows.push(window);
	}
	return windows;
}

/** The first retry waits this long; each next one twice as long. */
const RETRY_BASE_MS = 2_000;
/** No retry waits longer. */
const RETRY_MAX_MS = 120_000;
/**
 * Failures in a row after which a run stops; the reader's next move
 * starts a fresh one, so an outage never keeps a run asking.
 */
export const MAX_WINDOW_FAILURES = 6;

/** How long a window waits after its `failures`-th failure in a row. */
export function retryDelayMs(failures: number): number {
	return Math.min(
		RETRY_BASE_MS * 2 ** Math.max(failures - 1, 0),
		RETRY_MAX_MS,
	);
}
