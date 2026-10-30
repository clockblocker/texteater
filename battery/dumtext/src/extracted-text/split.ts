/**
 * A Scroll of an Extracted Text split into paragraphs and Sentences
 * (#1178): the step Intake re-runs from the stored Extracted Text, Scroll
 * by Scroll. The Scroll's own Heading, each Heading inside it and each
 * Paragraph is a block of its own, and a Line Break is a line break, so
 * `splitText` tells verse from a hard wrap as it does in pasted text. A
 * Scene Break holds no Sentence. Inline Styles and Original Locations do
 * not reach the Sentences yet.
 */
import { type SplitText, splitText } from "../split-text.js";
import type { Run, Scroll } from "./extracted-text.js";

const textOf = (runs: readonly Run[]) => runs.map(({ text }) => text).join("");

/** The Scroll as running text: blocks apart, Line Breaks kept. */
function runningText({ heading, blocks }: Scroll): string {
	return [
		...(heading ? [textOf(heading.runs)] : []),
		...blocks.flatMap((block) =>
			block.kind === "SceneBreak"
				? []
				: block.kind === "Heading"
					? [textOf(block.runs)]
					: [
							block.inlines
								.map((inline) =>
									inline.kind === "LineBreak"
										? "\n"
										: inline.text,
								)
								.join(""),
						],
		),
	].join("\n\n");
}

/** Splits a Scroll into its paragraphs and Sentences. */
export function splitScroll(scroll: Scroll): SplitText {
	return splitText(runningText(scroll));
}
