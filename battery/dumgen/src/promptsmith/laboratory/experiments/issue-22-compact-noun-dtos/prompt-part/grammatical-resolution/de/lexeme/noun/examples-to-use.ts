import type { ExampleSet } from "../../../../../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesToUse = [
	{
		id: "compact-grammar-use-library-dative",
		input: { c: "Wir sitzen in der <TARGET>Bibliothek</TARGET>." },
		idealOutput: {
			d: "R",
			r: {
				o: ["S"],
				s: {
					n: "Bibliothek",
					p: "C",
					r: "F",
					k: "I",
					h: null,
					i: { c: "D", n: "S" },
				},
				l: { c: "Bibliothek", g: "F", h: null },
			},
		},
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
