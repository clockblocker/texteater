import type { ExampleSet } from "../../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesToUse = [] as const satisfies ExampleSet<
	typeof inputSchema,
	typeof outputSchema
>;
