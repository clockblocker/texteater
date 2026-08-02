import type { ExampleSet } from "../../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesForTest = [
	{
		id: "target-single-noun",
		input: {
			clickedSegmentIndex: 2,
			segments: [
				{ kind: "ResolvableText", text: "Die" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Banken" },
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
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
