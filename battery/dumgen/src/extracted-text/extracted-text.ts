/**
 * Extracted Text: the stored form every Extraction produces and Intake
 * keeps, between Extraction and `splitText` (map #1175, #1176). It holds
 * Chapters of Headings and Paragraphs, with Line Breaks, Inline Styles and
 * Original Locations, as running text not yet split into Sentences. It
 * carries no language: Intake detects one per Sentence later (Dumgen ADR
 * 0001). Text is NFC and in logical order, so Hebrew is stored as read.
 * Markdown is only an import and an export of it (`markdown.ts`).
 */

/** An Inline Style kept from the Original on a run of text. */
export type InlineStyle = "Italic" | "Bold" | "Quotation";

/**
 * A rectangle on a Page Image, as fractions of the image's width and height
 * from its top-left corner: `{ x: 0, y: 0, width: 1, height: 1 }` is the
 * whole page. Image coordinates are physical, whatever the Text's direction.
 */
type PageArea = {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
};

/**
 * Where a piece of an Extracted Text sits in its Original: an area of a
 * Page Image (`page` counts the Original's Page Images from 0, and no
 * `area` means the whole page), a time span of a recording in
 * milliseconds, or a spot in the file, written in the file format's own
 * locator (an EPUB CFI, a PDF page). None is ever a character offset into
 * the Extracted Text: Segments are located by Sentence and index (Dumgen
 * ADR 0004).
 */
type OriginalLocation =
	| {
			readonly kind: "PageArea";
			readonly page: number;
			readonly area?: PageArea;
	  }
	| {
			readonly kind: "TimeSpan";
			readonly startMs: number;
			readonly endMs: number;
	  }
	| { readonly kind: "FileSpot"; readonly spot: string };

/**
 * A piece's Original Locations, in reading order. A piece may span several,
 * such as a Paragraph running over a page break. Any piece may carry them
 * or leave them to its parts or its parent.
 */
type Located = {
	readonly locations?: readonly OriginalLocation[];
};

/**
 * A run of text with its Inline Styles, if any, listed once each in the
 * order Italic, Bold, Quotation. Its text holds no line break; quotation
 * marks the Original prints stay in the text.
 */
export type Run = Located & {
	readonly kind: "Run";
	readonly text: string;
	readonly styles?: readonly InlineStyle[];
};

/** A Line Break the Original makes inside a Paragraph. */
export type LineBreak = { readonly kind: "LineBreak" };

/**
 * A Heading inside a Chapter. Levels count as in HTML, the Chapter's own
 * Heading being level 1, so the ones inside run from 2 to 6.
 */
export type Heading = Located & {
	readonly kind: "Heading";
	readonly level: 2 | 3 | 4 | 5 | 6;
	readonly runs: readonly Run[];
};

/**
 * A Paragraph: its runs, with a Line Break between two of them wherever the
 * Original breaks the line.
 */
export type Paragraph = Located & {
	readonly kind: "Paragraph";
	readonly inlines: readonly (Run | LineBreak)[];
};

/** A Chapter's own Heading, its title. */
type ChapterHeading = Located & { readonly runs: readonly Run[] };

/**
 * The piece of a Text that Intake processes and a Learner opens as a
 * whole: its own Heading, if it has one, and its Headings and Paragraphs.
 * A Chapter may hold no block, as a part's title page does.
 */
export type Chapter = {
	readonly heading?: ChapterHeading;
	readonly blocks: readonly (Heading | Paragraph)[];
};

/** The Extracted Text of one Original: its Chapters in order, at least one. */
export type ExtractedText = {
	readonly chapters: readonly Chapter[];
};

const paragraphBreak = /\n[^\S\n]*\n\s*/u;

/**
 * The Extracted Text of pasted text: one Chapter without Original
 * Locations. A blank line ends a Paragraph, and every other line break is
 * kept as a Line Break, since only a later step can tell verse from a hard
 * wrap. Lines are trimmed and the text is NFC; blank text gives an empty
 * Chapter.
 */
export function extractPastedText(text: string): ExtractedText {
	const blocks = text
		.normalize("NFC")
		.replace(/\r\n?/gu, "\n")
		.split(paragraphBreak)
		.map((paragraph) =>
			paragraph
				.split("\n")
				.map((line) => line.trim())
				.filter((line) => line.length > 0),
		)
		.filter((lines) => lines.length > 0)
		.map(
			(lines): Paragraph => ({
				kind: "Paragraph",
				inlines: lines.flatMap((line, index) => [
					...(index > 0 ? [{ kind: "LineBreak" } as const] : []),
					{ kind: "Run", text: line } as const,
				]),
			}),
		);
	return { chapters: [{ blocks }] };
}
