// README_BLOCK:basic-usage:start
import { buildDumgen } from "dumgen";

// Server-side only. The OpenAI SDK reads OPENAI_API_KEY from the environment.
const generate = buildDumgen();

const target =
	await generate.laboratory.targetClassification.de.highLevelWholeUnit({
	clickedSegmentIndex: 2,
	segments: [
		{ kind: "ResolvableText", text: "Er" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "steht" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "auf" },
	],
});

if (!("decision" in target)) console.log(target.memberSegmentIndices);
// README_BLOCK:basic-usage:end
