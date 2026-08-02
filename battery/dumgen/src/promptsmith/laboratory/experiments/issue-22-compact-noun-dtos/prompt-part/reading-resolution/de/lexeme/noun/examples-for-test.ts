import type { ExampleSet } from "../../../../../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesForTest = [
	{
		id: "compact-reading-bank",
		input: {
			c: "Die <TARGET>Banken</TARGET> sind geöffnet.",
			l: { c: "Bank", g: "F", h: null },
			e: [],
		},
		idealOutput: { d: "N", e: "🏦" },
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
