import type { ExampleSet } from "../../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesToUse = [
	{
		id: "target-use-discourse-formula",
		input: {
			clickedSegmentIndex: 0,
			segments: [
				{ kind: "ResolvableText", text: "Guten" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Morgen" },
				{ kind: "Punctuation", text: "!" },
			],
		},
		idealOutput: {
			decision: "Resolved",
			target: {
				additionalMemberSegmentIndices: [2],
				family: "Phraseme",
				kind: "DiscourseFormula",
			},
		},
	},
	{
		id: "target-use-noun-after-adjective",
		input: {
			clickedSegmentIndex: 4,
			segments: [
				{ kind: "ResolvableText", text: "der" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "heiße" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Kakao" },
			],
		},
		idealOutput: {
			decision: "Resolved",
			target: {
				additionalMemberSegmentIndices: [],
				family: "Lexeme",
				kind: "NOUN",
			},
		},
	},
	{
		id: "target-use-separable-verb",
		input: {
			clickedSegmentIndex: 2,
			segments: [
				{ kind: "ResolvableText", text: "Fritz" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "steht" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "sofort" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "auf" },
				{ kind: "Punctuation", text: "." },
			],
		},
		idealOutput: {
			decision: "Resolved",
			target: {
				additionalMemberSegmentIndices: [6],
				family: "Lexeme",
				kind: "VERB",
			},
		},
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
