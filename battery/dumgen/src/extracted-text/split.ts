/**
 * An Extracted Text split into paragraphs and Sentences (#1178): the step
 * Intake re-runs from the stored Extracted Text. Each Chapter's own Heading,
 * each Heading inside it and each Paragraph is a block of its own, and a
 * Line Break is a line break, so `splitText` tells verse from a hard wrap
 * as it does in pasted text. Inline Styles and Original Locations do not
 * reach the Sentences yet; Chapters run on into one another until a Text
 * keeps them apart (#1179).
 */
import { type SplitText, splitText } from "../segment/split-text.js";
import type { ExtractedText, Run } from "./extracted-text.js";

const textOf = (runs: readonly Run[]) => runs.map(({ text }) => text).join("");

/** The Extracted Text as running text: blocks apart, Line Breaks kept. */
function runningText(extracted: ExtractedText): string {
	return extracted.chapters
		.flatMap(({ heading, blocks }) => [
			...(heading ? [textOf(heading.runs)] : []),
			...blocks.map((block) =>
				block.kind === "Heading"
					? textOf(block.runs)
					: block.inlines
							.map((inline) =>
								inline.kind === "LineBreak"
									? "\n"
									: inline.text,
							)
							.join(""),
			),
		])
		.join("\n\n");
}

/** Splits an Extracted Text into its paragraphs and Sentences. */
export function splitExtractedText(extracted: ExtractedText): SplitText {
	return splitText(runningText(extracted));
}
