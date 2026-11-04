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
import type { LineBreak, Run, Scroll } from "./extracted-text.js";
import { runSources } from "./traced.js";

/** A block of a Scroll that holds text, and whether it is a Heading. */
type TextBlock = {
	readonly heading: boolean;
	readonly inlines: readonly (Run | LineBreak)[];
};

/** The Scroll's own Heading, then its Headings and Paragraphs in order. */
function textBlocks({ heading, blocks }: Scroll): TextBlock[] {
	return [
		...(heading ? [{ heading: true, inlines: heading.runs }] : []),
		...blocks.flatMap((block): TextBlock[] =>
			block.kind === "SceneBreak"
				? []
				: block.kind === "Heading"
					? [{ heading: true, inlines: block.runs }]
					: [{ heading: false, inlines: block.inlines }],
		),
	];
}

const textOf = (inline: Run | LineBreak) =>
	inline.kind === "LineBreak" ? "\n" : inline.text;

/** The Scroll as running text: blocks apart, Line Breaks kept. */
function runningText(scroll: Scroll): string {
	return textBlocks(scroll)
		.map(({ inlines }) => inlines.map(textOf).join(""))
		.join("\n\n");
}

/** Splits a Scroll into its paragraphs and Sentences. */
export function splitScroll(scroll: Scroll): SplitText {
	return splitText(runningText(scroll));
}

/**
 * The Scroll's running text as `splitScroll` splits it, with each code
 * unit's source offset (-1 where the Markdown reader did not trace it or
 * the running text joins blocks), and where each block starts in it.
 */
export function tracedRunningText(scroll: Scroll): {
	readonly text: string;
	readonly at: readonly number[];
	readonly blocks: readonly {
		readonly heading: boolean;
		readonly start: number;
	}[];
} {
	const at: number[] = [];
	const blocks: { heading: boolean; start: number }[] = [];
	for (const { heading, inlines } of textBlocks(scroll)) {
		if (blocks.length > 0) at.push(-1, -1);
		blocks.push({ heading, start: at.length });
		for (const inline of inlines) {
			const text = textOf(inline);
			const sources =
				inline.kind === "Run" ? runSources.get(inline) : undefined;
			for (let unit = 0; unit < text.length; unit++)
				at.push(sources?.[unit] ?? -1);
		}
	}
	return { text: runningText(scroll), at, blocks };
}
