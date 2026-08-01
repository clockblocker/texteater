import type {
	ExampleSet,
	ParsedExampleSet,
	PromptInputSchema,
	PromptOutputSchema,
} from "./contracts";

type PromptSourceForAssembly = {
	readonly route: string;
	readonly inputSchema: PromptInputSchema;
	readonly outputSchema: PromptOutputSchema;
	readonly body: string;
	readonly examplesToUse: ExampleSet<PromptInputSchema, PromptOutputSchema>;
};

export function validateExamples<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
>(
	route: string,
	inputSchema: InputSchema,
	outputSchema: OutputSchema,
	examples: ExampleSet<InputSchema, OutputSchema>,
): ParsedExampleSet<InputSchema, OutputSchema> {
	const ids = new Set<string>();
	return examples.map((example, index) => {
		const location = `Prompt Source "${route}" example ${index + 1}`;
		if (example.id.trim().length === 0) {
			throw new Error(`${location} has an empty ID.`);
		}
		if (ids.has(example.id)) {
			throw new Error(
				`Prompt Source "${route}" has duplicate example ID "${example.id}".`,
			);
		}
		ids.add(example.id);

		const parsedInput = inputSchema.safeParse(example.input);
		if (!parsedInput.success) {
			throw new Error(`${location} has invalid input.`, {
				cause: parsedInput.error,
			});
		}
		const parsedOutput = outputSchema.safeParse(example.idealOutput);
		if (!parsedOutput.success) {
			throw new Error(`${location} has invalid ideal output.`, {
				cause: parsedOutput.error,
			});
		}
		return {
			id: example.id,
			input: parsedInput.data,
			idealOutput: parsedOutput.data,
		};
	}) as ParsedExampleSet<InputSchema, OutputSchema>;
}

export function assembleSystemPrompt(source: PromptSourceForAssembly): string {
	const body = source.body.trim();
	if (body.length === 0) {
		throw new Error(`Prompt Source "${source.route}" has an empty body.`);
	}
	const examples = validateExamples(
		source.route,
		source.inputSchema,
		source.outputSchema,
		source.examplesToUse,
	);
	if (examples.length === 0) return body;

	const renderedExamples = examples.map(
		(example, index) =>
			`Example ${index + 1}\nInput:\n${stableJson(example.input)}\nIdeal output:\n${stableJson(example.idealOutput)}`,
	);
	return `${body}\n\nExamples to follow:\n\n${renderedExamples.join("\n\n")}`;
}

export function stableJson(value: unknown): string {
	return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
	if (value === null) return null;
	if (Array.isArray(value)) return value.map(normalize);
	if (typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.toSorted(([left], [right]) => left.localeCompare(right))
				.map(([key, nested]) => [key, normalize(nested)]),
		);
	}
	return value;
}
