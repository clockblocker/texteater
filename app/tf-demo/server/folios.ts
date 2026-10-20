/**
 * Folios: a book's Scroll is cut into Folios when it is written, and a
 * Folio is processed when the Learner asks for it (#1193, #1216). A Folio
 * is a run of whole Paragraphs of about `FOLIO_CHARACTERS`, never
 * splitting a Paragraph; a longer Paragraph is a Folio alone. Inside a
 * Folio, jev reads the Sentences still unprocessed in `language.detect`'s
 * windows of up to `WINDOW_SENTENCES`, and each window is stored in saves
 * of at most `SAVE_SEGMENTS` Segments. Everything here is pure, so the
 * Convex isolate cuts Folios without loading Dumgen.
 */

/** About how many characters one Folio holds. */
const FOLIO_CHARACTERS = 3_000;

/** At most how many Sentences one `language.detect` window reads. */
const WINDOW_SENTENCES = 30;

/**
 * At most how many characters one window holds, a lone longer Sentence
 * aside, so one jev round stays a modest size.
 */
const WINDOW_CHARACTERS = 15_000;

/** A stored Sentence as the Folio cut reads it. */
type FolioSentence = {
	readonly position: number;
	/** Absent for a Sentence stored before paragraphs were kept: it is one alone. */
	readonly paragraph?: number;
	readonly stitchedText: string;
};

/** One Folio: the Sentence positions from `start` up to `end`. */
export type FolioCut = {
	readonly start: number;
	readonly end: number;
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
		};
	});
}

/**
 * A Folio's unprocessed Sentences cut into consecutive windows of at most
 * `WINDOW_SENTENCES`, as even as they come, as `language.detect` cuts
 * them; a window over `WINDOW_CHARACTERS` is cut again where it would
 * pass them.
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

/**
 * At most how many Sentences one reader page holds. A book's reader loads
 * a page at a time (#1212): a Folio, or a Folio longer than this, such as
 * a Paragraph of a whole chapter, in runs of this many.
 */
export const PAGE_SENTENCES = 60;

/** A run of Sentence positions, from `start` up to `end`. */
type SentenceRange = { readonly start: number; readonly end: number };

/** The pages a reader loads a book Scroll in, for its Folios in order. */
export function readerPages(
	folios: readonly SentenceRange[],
	size: number = PAGE_SENTENCES,
): SentenceRange[] {
	return folios.flatMap(({ start, end }) =>
		Array.from({ length: Math.ceil((end - start) / size) }, (_, run) => ({
			start: start + run * size,
			end: Math.min(end, start + (run + 1) * size),
		})),
	);
}

/**
 * At most how many Segments one save of a processed window writes, so a
 * save stays well inside a Convex mutation's 1 s (#1214): a 30-Sentence
 * window of about 750 Segments timed out in one save under load.
 */
const SAVE_SEGMENTS = 200;

/** A processed Sentence as a save cuts it: its Segments and the rest. */
type SavableSentence = {
	readonly sentenceId: string;
	readonly segments: readonly unknown[];
};

/**
 * One Sentence's share of a save: its Segments from index `from`, and,
 * on its last share, `analysis`, the rest of what intake found, whose
 * storing marks the Sentence processed.
 */
export type SavedSentence<Sentence extends SavableSentence> = {
	readonly sentenceId: Sentence["sentenceId"];
	readonly from: number;
	readonly segments: readonly Sentence["segments"][number][];
	readonly analysis?: Omit<Sentence, "sentenceId" | "segments">;
};

/**
 * A processed window's Sentences cut into saves of at most `size`
 * Segments, in order. A Sentence that does not fit the save being filled
 * starts the next, and one longer than a save is spread over several;
 * only its last share marks it processed, so a save that fails leaves it
 * unprocessed, to be asked again.
 */
export function savesOf<Sentence extends SavableSentence>(
	sentences: readonly Sentence[],
	size: number = SAVE_SEGMENTS,
): SavedSentence<Sentence>[][] {
	const saves: SavedSentence<Sentence>[][] = [];
	let save: SavedSentence<Sentence>[] = [];
	let room = size;
	const close = () => {
		if (save.length > 0) saves.push(save);
		save = [];
		room = size;
	};
	for (const { sentenceId, segments: all, ...analysis } of sentences) {
		const segments: readonly Sentence["segments"][number][] = all;
		if (segments.length > room) close();
		let from = 0;
		do {
			const share = segments.slice(from, from + room);
			const start = from;
			from += share.length;
			room -= share.length;
			save.push({
				sentenceId,
				from: start,
				segments: share,
				...(from >= segments.length ? { analysis } : {}),
			});
			if (from < segments.length) close();
		} while (from < segments.length);
	}
	close();
	return saves;
}
