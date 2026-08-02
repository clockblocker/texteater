import type { ExampleSet } from "../../../../../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesToUse = [
	{
		id: "compact-reading-use-new-library",
		input: {
			c: "Wir sitzen in der <TARGET>Bibliothek</TARGET>.",
			l: { c: "Bibliothek", g: "F", h: null },
			e: [],
		},
		idealOutput: { d: "N", e: "📚" },
	},
	{
		id: "compact-reading-use-reuse-tea",
		input: {
			c: "Der <TARGET>Tee</TARGET> duftet.",
			l: { c: "Tee", g: "M", h: null },
			e: ["☕"],
		},
		idealOutput: { d: "R", e: "☕" },
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
