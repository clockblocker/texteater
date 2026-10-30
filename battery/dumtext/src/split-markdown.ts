/**
 * `splitMarkdown`, the span API's Markdown entry (#1294): a Markdown
 * document read as `extractedTextFromMarkdown` reads it and split as
 * `splitScroll` splits each of its Scrolls, each Sentence with its offsets
 * into the Markdown itself.
 */
import { required } from "common-utils";
import type { ExtractedText, Scroll } from "./extracted-text/extracted-text.js";
import { extractedTextFromMarkdown } from "./extracted-text/markdown.js";
import { tracedRunningText } from "./extracted-text/split.js";
import {
	locate,
	type Normalized,
	normalized,
	type SplitSpans,
} from "./split-spans.js";
import { titledParagraphs } from "./split-text.js";

type Contents = ExtractedText["contents"];

const scrollsOf = (contents: Contents): Scroll[] =>
	contents.flatMap((item) =>
		item.kind === "Section" ? scrollsOf(item.contents) : [item],
	);

/** One Scroll's paragraphs, located in the NFC Markdown and then the input. */
function scrollSpans(
	scroll: Scroll,
	nfc: Normalized,
): SplitSpans["paragraphs"] {
	const running = tracedRunningText(scroll);
	const paragraphs = titledParagraphs(running.text);
	const located = locate(
		running.text,
		paragraphs.flatMap(({ sentences }) => sentences),
	);
	const source = (unit: number) => {
		const at = running.at[unit] ?? -1;
		if (at < 0) throw Error(`Running text unit ${unit} has no source`);
		return at;
	};
	let next = 0;
	return paragraphs.map(({ sentences }) => {
		const spans = sentences.map((text) => {
			const { first, last } = required(
				located[next++],
				"Every Sentence is located",
			);
			return {
				text,
				start: nfc.from(source(first)),
				end: nfc.to(source(last - 1)),
				first,
			};
		});
		const opening = spans[0]?.first ?? 0;
		const block = running.blocks.findLast(({ start }) => start <= opening);
		return {
			kind: block?.heading ? "Heading" : "Paragraph",
			sentences: spans.map(({ text, start, end }) => ({
				text,
				start,
				end,
			})),
		};
	});
}

/**
 * A Markdown document's paragraphs and Sentences, as
 * `extractedTextFromMarkdown` and `splitScroll` give them, Scroll after
 * Scroll in reading order, each Sentence with its offsets into `markdown`.
 * A Sentence's text is its words as the reader keeps them, markup gone,
 * and its span runs from the source of its first character to the source
 * of its last, so it may hold markup: `*spät*.` for `spät.`. A Heading,
 * the Scroll's own `#` included, is a `Heading`; a Section's title is no
 * Sentence.
 */
export function splitMarkdown(markdown: string): SplitSpans {
	const nfc = normalized(markdown);
	return {
		paragraphs: scrollsOf(
			extractedTextFromMarkdown(markdown).contents,
		).flatMap((scroll) => scrollSpans(scroll, nfc)),
	};
}
