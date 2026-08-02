import type { ExampleSet } from "../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesToUse = [
	{
		id: "intake-german-with-local-noise",
		input: { text: "Der Kaffe ist heiß, see you!" },
		idealOutput: { decision: "Accepted", language: "de" },
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
