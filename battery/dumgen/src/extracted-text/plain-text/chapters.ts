/**
 * A `.txt` book's Sections and Scrolls from its chapter headings (#1190).
 *
 * A chapter heading is a short line standing alone between blank lines:
 * `Kapitel 3`, `3. Kapitel`, `Erstes Kapitel`, `CHAPTER III.`, `Chapter
 * One`, `פרק י״א`, or a number alone (`12`, `IV.`). A Paragraph opening a
 * Bible chapter's first verse (`3:1 …`) starts a chapter too, without a
 * heading. A line under a heading that reads as a title (`Down the
 * Rabbit-Hole`) is its subtitle. A heading counts only when its pattern
 * repeats, and a number alone, or a verse, only when the numbers run on
 * in order; a run of headings with nothing between them is a table of
 * contents, not chapters. Each chapter becomes a Scroll, with its heading
 * as the Scroll's own and its subtitle as a Heading inside, and text
 * before the first chapter becomes a Scroll without one. A second
 * repeating chapter pattern makes Headings inside the Scrolls.
 *
 * Headings one level up (`Erster Teil`, `Buch 2`, `PART ONE`, `Book the
 * First`, `חלק ב`) open nested Sections; with no chapters they are the
 * chapters. When the chapter count starts again at one after titles that
 * stand alone, as the books of a Bible do, those titles open the Sections
 * instead. With no chapters, the book has no structure here, and the size
 * cut takes over.
 */
import type {
	Heading,
	Paragraph,
	SceneBreak,
	Scroll,
	Section,
} from "../extracted-text.js";
import {
	paragraphOf,
	runsOf,
	type TextBlock,
	withoutStrayBreaks,
} from "./blocks.js";
import { numberOf } from "./numbers.js";

type Level = "Part" | "Chapter";

/**
 * How a block marks a chapter or part: a heading line, a number alone, or
 * a Bible chapter's first verse. The key names the pattern that has to
 * repeat.
 */
type Marker = {
	readonly key: string;
	readonly level: Level;
	readonly shape: "Heading" | "Number" | "Verse";
	readonly number: number | undefined;
};

const levels: Readonly<Record<string, Level>> = {
	chapter: "Chapter",
	"chap.": "Chapter",
	kapitel: "Chapter",
	פרק: "Chapter",
	part: "Part",
	book: "Part",
	volume: "Part",
	teil: "Part",
	buch: "Part",
	band: "Part",
	חלק: "Part",
	ספר: "Part",
};

const keyword = `(${Object.keys(levels).join("|").replace(".", "\\.")})`;
const numbering = `(\\d{1,4}|[\\p{L}׳״'"]+)`;
/** What may follow a heading's number: a full stop, or a title. */
const rest = `(?:\\s*[.:—–-]+\\s*\\S.*|\\s*[.:])?`;

const keywordFirst = new RegExp(
	`^${keyword}\\s+(?:the\\s+)?${numbering}${rest}$`,
	"iu",
);
const numberFirst = new RegExp(`^(\\d{1,4})\\.\\s*${keyword}${rest}$`, "iu");
const ordinalFirst = new RegExp(
	`^(?:(?:the|das|der|die)\\s+)?(\\p{L}+)\\s+${keyword}(?:[.:]|\\s+\\S.*)?$`,
	"iu",
);
const ordinalWord =
	/^(?:\p{L}+(?:st|nd|rd|th)|\p{L}+te[snrm]?|last|final|letzte[snrm]?)$/iu;
const numberAlone = /^(\d{1,3}|[IVXLCDM]+)\.?$/u;
const firstVerse = /^(\d{1,3}):1\s/u;

const sentenceEnd = /[.,;:!?…]["'”’»«)\]]*$/u;
const speechOpening = /^["'„“‚‘»«›‹([—–-]/u;

/** A line that reads as a title: short, with no sentence ending. */
const isTitleLine = (line: string) =>
	line.length <= 100 &&
	/\p{L}/u.test(line) &&
	!sentenceEnd.test(line) &&
	!speechOpening.test(line);

function headingMarker(line: string): Marker | undefined {
	if (line.length > 80) return undefined;
	const alone = numberAlone.exec(line);
	if (alone !== null)
		return {
			key: `Number:${/\d/u.test(alone[1] ?? "") ? "arabic" : "roman"}`,
			level: "Chapter",
			shape: "Number",
			number: numberOf(alone[1] ?? ""),
		};
	const byKeyword = keywordFirst.exec(line);
	const byNumber = numberFirst.exec(line);
	const byOrdinal = ordinalFirst.exec(line);
	const [shape, word, number] =
		byKeyword !== null
			? ["keyword", byKeyword[1], numberOf(byKeyword[2] ?? "")]
			: byNumber !== null
				? ["number", byNumber[2], numberOf(byNumber[1] ?? "")]
				: byOrdinal !== null && ordinalWord.test(byOrdinal[1] ?? "")
					? ["ordinal", byOrdinal[2], numberOf(byOrdinal[1] ?? "")]
					: [];
	if (shape === undefined || word === undefined) return undefined;
	if (shape !== "ordinal" && number === undefined) return undefined;
	const name =
		word.toLowerCase() === "chap." ? "chapter" : word.toLowerCase();
	const level = levels[name];
	if (level === undefined) return undefined;
	return {
		key: `${level}:${shape}:${name}`,
		level,
		shape: "Heading",
		number,
	};
}

/** How a block marks a chapter or part, if it does. */
function markerOf(block: TextBlock): Marker | undefined {
	if (block.kind !== "Paragraph") return undefined;
	const [first = "", second, ...more] = block.lines;
	const verse = firstVerse.exec(first);
	if (verse !== null)
		return {
			key: "Chapter:verse",
			level: "Chapter",
			shape: "Verse",
			number: Number(verse[1]),
		};
	if (more.length > 0 || (second !== undefined && !isTitleLine(second)))
		return undefined;
	return headingMarker(first);
}

const titleBlock = (block: TextBlock | undefined) =>
	block?.kind === "Paragraph" &&
	block.lines.length === 1 &&
	isTitleLine(block.lines[0] ?? "");

/**
 * Whether numbers run on in order: each one more than the last, or one
 * again at a new book, allowing a few missed.
 */
function inOrder(numbers: readonly (number | undefined)[]): boolean {
	if (numbers[0] !== 1) return false;
	let exact = 0;
	for (const [index, number] of numbers.entries()) {
		if (index === 0) continue;
		const previous = numbers[index - 1] ?? 0;
		if (number === undefined || (number !== 1 && number <= previous))
			return false;
		if (number === 1 || number === previous + 1) exact++;
	}
	return exact >= 0.8 * (numbers.length - 1);
}

/** The repeating patterns, each with how often it marks a block. */
function repeatingPatterns(
	markers: readonly (Marker | undefined)[],
): Map<string, { readonly marker: Marker; readonly count: number }> {
	const byKey = new Map<string, Marker[]>();
	for (const marker of markers) {
		if (marker === undefined) continue;
		const found = byKey.get(marker.key) ?? [];
		found.push(marker);
		byKey.set(marker.key, found);
	}
	const patterns = new Map<
		string,
		{ readonly marker: Marker; readonly count: number }
	>();
	for (const [key, found] of byKey) {
		const [marker] = found;
		if (marker === undefined || found.length < 2) continue;
		if (
			marker.shape !== "Heading" &&
			!inOrder(found.map(({ number }) => number))
		)
			continue;
		patterns.set(key, { marker, count: found.length });
	}
	return patterns;
}

const shapeRank = { Heading: 0, Verse: 1, Number: 2 } as const;

/** The pattern that best marks a level: headings first, then the most. */
function bestPattern(
	patterns: ReturnType<typeof repeatingPatterns>,
	level: Level,
): string | undefined {
	return [...patterns.values()]
		.filter(({ marker }) => marker.level === level)
		.sort(
			(a, b) =>
				shapeRank[a.marker.shape] - shapeRank[b.marker.shape] ||
				b.count - a.count,
		)[0]?.marker.key;
}

/** Where the book's chapters, parts and inner headings start. */
type Plan = {
	/** A chapter's block, with its subtitle's block if it has one. */
	readonly scrolls: Map<number, { readonly subtitle?: number }>;
	/** A Section's first block, with its title and the blocks it uses. */
	readonly sections: Map<
		number,
		{ readonly title: string; readonly uses: number }
	>;
	readonly headings: Set<number>;
};

const lineOf = (block: TextBlock | undefined) =>
	block?.kind === "Paragraph" ? (block.lines[0] ?? "") : "";

const joinTitle = (lines: readonly string[]) =>
	lines.reduce((title, line) =>
		/[.:]$/u.test(title) ? `${title} ${line}` : `${title}: ${line}`,
	);

/**
 * Sections where the chapter count starts again at one, each titled by
 * the one or two title lines standing just before it; none unless the
 * count starts again at least twice and every start has a title.
 */
function restartSections(
	blocks: readonly TextBlock[],
	markers: readonly (Marker | undefined)[],
	scrolls: Plan["scrolls"],
): Plan["sections"] | undefined {
	const used = new Set(
		[...scrolls.values()].flatMap(({ subtitle }) =>
			subtitle === undefined ? [] : [subtitle],
		),
	);
	const sections: Plan["sections"] = new Map();
	for (const index of scrolls.keys()) {
		if (markers[index]?.number !== 1) continue;
		let first = index;
		while (
			first > 0 &&
			index - first < 2 &&
			titleBlock(blocks[first - 1]) &&
			!scrolls.has(first - 1) &&
			!used.has(first - 1)
		)
			first--;
		if (first === index) return undefined;
		const titles = blocks.slice(first, index).map(lineOf);
		sections.set(first, { title: joinTitle(titles), uses: index - first });
	}
	return sections.size >= 2 ? sections : undefined;
}

/** Sections at each part heading, titled by it and its subtitle. */
function partSections(
	blocks: readonly TextBlock[],
	markers: readonly (Marker | undefined)[],
	partKey: string,
): Plan["sections"] {
	const sections: Plan["sections"] = new Map();
	for (const [index, marker] of markers.entries()) {
		if (marker?.key !== partKey) continue;
		const block = blocks[index];
		const lines = block?.kind === "Paragraph" ? [...block.lines] : [];
		const next = blocks[index + 1];
		const subtitled =
			lines.length === 1 &&
			titleBlock(next) &&
			markers[index + 1] === undefined;
		if (subtitled) lines.push(lineOf(next));
		sections.set(index, {
			title: joinTitle(lines),
			uses: subtitled ? 2 : 1,
		});
	}
	return sections;
}

/** Where chapters and parts start, or none if the book shows no chapters. */
function planOf(blocks: readonly TextBlock[]): Plan | undefined {
	const found = blocks.map(markerOf);
	const markers = found.map((marker, index) => {
		if (marker?.shape !== "Heading" && marker?.shape !== "Number")
			return marker;
		const next =
			titleBlock(blocks[index + 1]) && found[index + 1] === undefined
				? index + 2
				: index + 1;
		return found[next]?.key === marker.key ? undefined : marker;
	});
	const patterns = repeatingPatterns(markers);
	let chapterKey = bestPattern(patterns, "Chapter");
	let partKey = bestPattern(patterns, "Part");
	if (chapterKey === undefined) [chapterKey, partKey] = [partKey, undefined];
	if (chapterKey === undefined) return undefined;
	const scrolls: Plan["scrolls"] = new Map();
	const headings = new Set<number>();
	for (const [index, marker] of markers.entries()) {
		if (marker === undefined) continue;
		if (marker.key === chapterKey) {
			const subtitled =
				marker.shape !== "Verse" &&
				lineCount(blocks[index]) === 1 &&
				titleBlock(blocks[index + 1]) &&
				markers[index + 1] === undefined &&
				index + 2 < blocks.length;
			scrolls.set(index, subtitled ? { subtitle: index + 1 } : {});
		} else if (
			marker.level === "Chapter" &&
			marker.shape !== "Verse" &&
			patterns.has(marker.key)
		)
			headings.add(index);
	}
	const sections =
		restartSections(blocks, markers, scrolls) ??
		(partKey === undefined
			? new Map()
			: partSections(blocks, markers, partKey));
	return { scrolls, sections, headings };
}

const lineCount = (block: TextBlock | undefined) =>
	block?.kind === "Paragraph" ? block.lines.length : 0;

const headingBlock = (level: Heading["level"], line: string): Heading => ({
	kind: "Heading",
	level,
	runs: runsOf(line),
});

/** A book's Sections and Scrolls, written in reading order. */
class BookDraft {
	readonly contents: (Section | Scroll)[] = [];
	#part: { readonly title: string; readonly contents: Scroll[] } | undefined;
	#heading: Scroll["heading"] | undefined;
	#blocks: (Heading | Paragraph | SceneBreak)[] = [];

	/** Ends the Scroll being written, kept if it has a heading or a block. */
	closeScroll(): void {
		const blocks = withoutStrayBreaks(this.#blocks);
		if (this.#heading !== undefined || blocks.length > 0)
			(this.#part?.contents ?? this.contents).push({
				kind: "Scroll",
				...(this.#heading ? { heading: this.#heading } : {}),
				blocks,
			});
		this.#heading = undefined;
		this.#blocks = [];
	}

	/** Ends the Section being written, kept if it holds a Scroll. */
	closePart(): void {
		this.closeScroll();
		const [first, ...rest] = this.#part?.contents ?? [];
		if (this.#part !== undefined && first !== undefined)
			this.contents.push({
				kind: "Section",
				title: this.#part.title,
				contents: [first, ...rest],
			});
		this.#part = undefined;
	}

	openPart(title: string): void {
		this.closePart();
		this.#part = { title, contents: [] };
	}

	openScroll(heading?: string): void {
		this.closeScroll();
		if (heading !== undefined) this.#heading = { runs: runsOf(heading) };
	}

	push(block: Heading | Paragraph | SceneBreak): void {
		this.#blocks.push(block);
	}
}

/**
 * Opens a chapter's Scroll at its block: a Bible chapter's first verse
 * stays its first Paragraph; a heading becomes the Scroll's own, and its
 * subtitle a Heading inside. Returns the index of the block after them.
 */
function openChapter(
	book: BookDraft,
	blocks: readonly TextBlock[],
	index: number,
	subtitle: number | undefined,
): number {
	const block = blocks[index];
	const [first = "", second] = block?.kind === "Paragraph" ? block.lines : [];
	if (block?.kind === "Paragraph" && firstVerse.test(first)) {
		book.openScroll();
		book.push(paragraphOf(block.lines));
		return index + 1;
	}
	book.openScroll(first);
	const title =
		second ??
		(subtitle === undefined ? undefined : lineOf(blocks[subtitle]));
	if (title !== undefined) book.push(headingBlock(2, title));
	return (subtitle ?? index) + 1;
}

/**
 * The book's Sections and Scrolls from its chapter headings, in reading
 * order, or `undefined` when it shows no chapters.
 */
export function chapterContents(
	blocks: readonly TextBlock[],
): (Section | Scroll)[] | undefined {
	const plan = planOf(blocks);
	if (plan === undefined) return undefined;
	const book = new BookDraft();
	let next = 0;
	for (const [index, block] of blocks.entries()) {
		if (index < next) continue;
		const section = plan.sections.get(index);
		const chapter = plan.scrolls.get(index);
		if (section !== undefined) {
			book.openPart(section.title);
			next = index + section.uses;
		} else if (chapter !== undefined)
			next = openChapter(book, blocks, index, chapter.subtitle);
		else if (plan.headings.has(index) && block.kind === "Paragraph") {
			const [first = "", second] = block.lines;
			book.push(headingBlock(2, first));
			if (second !== undefined) book.push(headingBlock(3, second));
		} else
			book.push(
				block.kind === "SceneBreak" ? block : paragraphOf(block.lines),
			);
	}
	book.closePart();
	return book.contents;
}
