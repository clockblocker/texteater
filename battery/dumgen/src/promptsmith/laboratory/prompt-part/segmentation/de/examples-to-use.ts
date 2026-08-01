import type { ExampleSet } from "../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesToUse = [
	{
		id: "segmentation-use-simple-sentence",
		input: { text: "Der Kaffee ist heiß." },
		idealOutput: {
			segments: [
				{ kind: "ResolvableText", text: "Der" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Kaffee" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "ist" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "heiß" },
				{ kind: "Punctuation", text: "." },
			],
		},
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
