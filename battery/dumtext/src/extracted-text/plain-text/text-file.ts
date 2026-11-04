/**
 * A `.txt` book's Extracted Text (#1190): one Section, titled by the
 * book's Gutenberg title or else its file name, holding the book's
 * Scrolls. This is a reader of its own, not the Markdown import, which
 * would misread `*`, `_`, `#` and verse. The file's charset is detected
 * (`decode.ts`), Gutenberg's wrapping is dropped (`gutenberg.ts`), and the
 * text is read into Paragraphs and Scene Breaks (`blocks.ts`). Its chapter
 * headings make the Scrolls and nested Sections (`chapters.ts`); with
 * none, it is cut by size into numbered Scrolls (`size-cut.ts`).
 */
import type { ExtractedText } from "../extracted-text.js";
import { paragraphOf, readBlocks } from "./blocks.js";
import { chapterContents } from "./chapters.js";
import { decodeTextFile } from "./decode.js";
import { unwrapGutenberg } from "./gutenberg.js";
import { cutBySize, type SizeCut } from "./size-cut.js";

const oneLine = (title: string) => title.replace(/\s+/gu, " ").trim();

/** A file's name without its folders and its `.txt`, as a title. */
function titleOfFile(name: string): string {
	const base = name.split(/[/\\]/u).at(-1) ?? name;
	return oneLine(base.replace(/\.txt$/iu, "").replace(/_+/gu, " "));
}

/**
 * The Extracted Text of a book's text, under a Section with `title`
 * unless the text carries a Gutenberg title. `sizes` overrides the size
 * cut's sizes, for tests.
 */
export function extractPlainText(
	text: string,
	title: string,
	sizes?: SizeCut,
): ExtractedText {
	const unwrapped = unwrapGutenberg(
		text.replace(/\r\n?/gu, "\n").normalize("NFC"),
	);
	const blocks = readBlocks(unwrapped.body);
	const [first, ...rest] =
		chapterContents(blocks) ??
		cutBySize(
			blocks.map((block) =>
				block.kind === "SceneBreak" ? block : paragraphOf(block.lines),
			),
			sizes,
		);
	return {
		contents: [
			{
				kind: "Section",
				title:
					oneLine(unwrapped.title ?? "") || oneLine(title) || "Text",
				contents: first
					? [first, ...rest]
					: [{ kind: "Scroll", blocks: [] }],
			},
		],
	};
}

/** The Extracted Text of a `.txt` file a Learner or curator submits. */
export function extractTextFile(file: {
	readonly name: string;
	readonly bytes: Uint8Array;
}): ExtractedText {
	return extractPlainText(decodeTextFile(file.bytes), titleOfFile(file.name));
}
