import type { ExampleSet } from "../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesForTest = [
	{
		id: "intake-german-coffee",
		input: { text: "Der Kaffee ist heiß." },
		idealOutput: { decision: "Accepted", language: "de" },
	},
	{
		id: "intake-french-greeting",
		input: { text: "Bonjour tout le monde." },
		idealOutput: { decision: "UnsupportedLanguage", language: "fr" },
	},
	{
		id: "intake-symbol-noise",
		input: { text: "xqz %%% 111" },
		idealOutput: { decision: "Unintelligible", language: null },
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
