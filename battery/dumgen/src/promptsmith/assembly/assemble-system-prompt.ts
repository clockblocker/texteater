import { stableJson } from "../../lib/stable-json";
import type { PromptSource } from "./contracts";

export function assembleSystemPrompt(source: PromptSource): string {
	const body = source.body.trim();
	if (body.length === 0) {
		throw new Error(`Prompt Source "${source.route}" has an empty body.`);
	}
	const examples = source.demonstrations?.cases ?? [];
	if (examples.length === 0) return body;

	const renderedExamples = examples.map((example, index) => {
		const explanation =
			example.explanation === undefined
				? ""
				: `\nExplanation (guidance only; not part of the output):\n${example.explanation}`;
		return `Example ${index + 1}\nInput:\n${stableJson(example.input)}\nIdeal output:\n${stableJson(example.idealOutput)}${explanation}`;
	});
	return `${body}\n\nExamples to follow:\n\n${renderedExamples.join("\n\n")}`;
}
