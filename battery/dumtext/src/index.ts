/**
 * Dumtext's public entry: text in, Extracted Text and its paragraphs and
 * Sentences out, in code and with no model (#1294). `extractPastedText`
 * turns pasted text into the one Scroll of its Extracted Text,
 * `extractTextFile` reads a `.txt` file into Sections and Scrolls,
 * `scrollFromHtml` maps a parsed HTML tree into one Scroll, and
 * `extractedTextFromMarkdown` reads a Markdown document into Sections and
 * Scrolls. `parseScroll` checks a stored Scroll without Zod. `splitScroll`
 * splits a Scroll into paragraphs and Sentences with `splitText`, which
 * splits any text the same way in every language, since it runs before a
 * Sentence's language is known (Dumgen ADR 0007).
 *
 * The span API splits the same way and says where each Sentence stands in
 * the host's own string, as UTF-16 offsets into that input and never into
 * a stored Extracted Text (Dumgen ADR 0004): `splitMarkdown` for a
 * Markdown document, `splitTextSpans` for plain text. It is consumed by
 * filler-de, outside this repository, so knip's baseline keeps it.
 */
export {
	type ExtractedText,
	extractPastedText,
	type Scroll,
} from "./extracted-text/extracted-text.js";
export { scrollFromHtml } from "./extracted-text/html.js";
export { extractedTextFromMarkdown } from "./extracted-text/markdown.js";
export { parseScroll } from "./extracted-text/parse.js";
export { extractTextFile } from "./extracted-text/plain-text/text-file.js";
export { splitScroll } from "./extracted-text/split.js";
export { splitMarkdown } from "./split-markdown.js";
export {
	type SentenceSpan,
	type SplitSpans,
	splitTextSpans,
} from "./split-spans.js";
export { splitText } from "./split-text.js";
