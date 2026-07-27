import { stableJsonPretty } from "../serialize/stable-stringify";
import type { PromptExample, PromptSource } from "../types";
import { renderSchemaContract } from "./render-schema-contract";

export function renderSystemPrompt(
	source: PromptSource,
	usedExamples: readonly PromptExample[],
): string {
	const sections: string[] = [];

	if (source.agentRole) {
		sections.push(["Agent role:", source.agentRole].join("\n"));
	}

	sections.push(["Task:", source.taskDescription].join("\n"));

	sections.push(
		[
			"Examples:",
			usedExamples
				.map((example, index) =>
					[
						`Example ${index + 1} (${example.id})`,
						"Input:",
						renderValueForPrompt(example.input),
						"Ideal output:",
						renderValueForPrompt(example.idealOutput),
					].join("\n"),
				)
				.join("\n\n"),
		].join("\n"),
	);

	if (source.outputSchema) {
		sections.push(
			[
				"Response format:",
				"Return only JSON that matches this shape:",
				renderSchemaContract(source.outputSchema),
			].join("\n"),
		);
	}

	sections.push(
		[
			"Final instructions:",
			"Follow the task description and examples exactly.",
			"Do not explain your answer outside the requested output format.",
		].join("\n"),
	);

	return sections.join("\n\n");
}

function renderValueForPrompt(value: unknown): string {
	if (typeof value === "string") {
		return JSON.stringify(value);
	}

	if (value === undefined) {
		return "undefined";
	}

	return stableJsonPretty(value);
}
