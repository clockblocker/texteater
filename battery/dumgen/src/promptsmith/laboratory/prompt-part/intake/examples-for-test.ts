import type { ExampleSet } from "../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesForTest = [
	{
		id: "intake-test-accepted-de",
		input: { text: "Der Kaffee ist heiß." },
		idealOutput: { decision: "Accepted", language: "de" },
	},
	{
		id: "intake-test-unsupported-fr",
		input: { text: "Bonjour tout le monde." },
		idealOutput: { decision: "UnsupportedLanguage", language: "fr" },
	},
	{
		id: "intake-test-unintelligible",
		input: { text: "xqz %%% 111" },
		idealOutput: { decision: "Unintelligible", language: null },
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
