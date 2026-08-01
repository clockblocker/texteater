import type { ExampleSet } from "../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesToUse = [
	{
		id: "segmentation-use-attached-punctuation",
		input: { text: "Still, aber wach!" },
		idealOutput: {
			segments: [
				{ kind: "ResolvableText", text: "Still" },
				{ kind: "Punctuation", text: "," },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "aber" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "wach" },
				{ kind: "Punctuation", text: "!" },
			],
		},
	},
	{
		id: "segmentation-test-opaque-span",
		input: { text: "Wir treffen quux42 später." },
		idealOutput: {
			segments: [
				{ kind: "ResolvableText", text: "Wir" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "treffen" },
				{ kind: "Whitespace", text: " " },
				{ kind: "OpaqueText", text: "quux42" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "später" },
				{ kind: "Punctuation", text: "." },
			],
		},
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
