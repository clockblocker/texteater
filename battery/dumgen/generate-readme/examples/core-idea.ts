// README_BLOCK:basic-usage:start
import { buildDumgen } from "dumgen";

// Server-side only. The OpenAI SDK reads OPENAI_API_KEY from the environment.
const generate = buildDumgen();

const selection = await generate.laboratory.classification.de.selection({
	language: "de",
	segmentedSentenceId: "laboratory-sentence-1",
	clickedSegmentIndex: 2,
	segments: [
		{ index: 0, kind: "ResolvableText", text: "Er" },
		{ index: 1, kind: "Whitespace", text: " " },
		{ index: 2, kind: "ResolvableText", text: "steht" },
		{ index: 3, kind: "Whitespace", text: " " },
		{ index: 4, kind: "ResolvableText", text: "auf" },
	],
});

console.log(selection.surfaceSegmentIndices);
// README_BLOCK:basic-usage:end
