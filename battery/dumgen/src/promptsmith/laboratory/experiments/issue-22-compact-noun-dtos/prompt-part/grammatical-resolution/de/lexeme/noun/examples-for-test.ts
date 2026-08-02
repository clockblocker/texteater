import type { ExampleSet } from "../../../../../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesForTest = [
	{
		id: "compact-grammar-bank-plural",
		input: { c: "Die <TARGET>Banken</TARGET> sind geöffnet." },
		idealOutput: {
			d: "R",
			r: {
				o: ["S"],
				s: {
					n: "Banken",
					p: "C",
					r: "F",
					k: "I",
					h: null,
					i: { c: "N", n: "P" },
				},
				l: { c: "Bank", g: "F", h: null },
			},
		},
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
