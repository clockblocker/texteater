import { PromptInfraValidationError } from "./errors";
import type { PromptSource } from "./types";

export function validatePromptSource(source: PromptSource): void {
	const issues: string[] = [];

	if (source.taskDescription.trim().length === 0) {
		issues.push("taskDescription must be non-empty after trimming");
	}

	if (!Number.isInteger(source.numOfFirstExamplesToUse)) {
		issues.push("numOfFirstExamplesToUse must be an integer");
	}

	if (source.numOfFirstExamplesToUse < 0) {
		issues.push("numOfFirstExamplesToUse must be >= 0");
	}

	if (source.examples.length === 0) {
		issues.push("examples must be a non-empty array");
	}

	if (source.examples.length <= source.numOfFirstExamplesToUse) {
		issues.push(
			"examples.length must be greater than numOfFirstExamplesToUse",
		);
	}

	const seenIds = new Set<string>();

	for (const [index, example] of source.examples.entries()) {
		if (typeof example.id !== "string" || example.id.trim().length === 0) {
			issues.push(`examples[${index}].id must be a non-empty string`);
		}

		if (seenIds.has(example.id)) {
			issues.push(`examples[${index}].id must be unique`);
		}
		seenIds.add(example.id);

		if (!Object.hasOwn(example, "input")) {
			issues.push(`examples[${index}] must explicitly contain input`);
		}

		if (!Object.hasOwn(example, "idealOutput")) {
			issues.push(
				`examples[${index}] must explicitly contain idealOutput`,
			);
		}

		if (source.inputSchema) {
			const parsedInput = source.inputSchema.safeParse(example.input);
			if (!parsedInput.success) {
				issues.push(
					`examples[${index}].input failed inputSchema validation: ${parsedInput.error.message}`,
				);
			}
		}

		if (source.outputSchema) {
			const parsedOutput = source.outputSchema.safeParse(
				example.idealOutput,
			);
			if (!parsedOutput.success) {
				issues.push(
					`examples[${index}].idealOutput failed outputSchema validation: ${parsedOutput.error.message}`,
				);
			}
		}
	}

	if (issues.length > 0) {
		throw new PromptInfraValidationError(issues);
	}
}
