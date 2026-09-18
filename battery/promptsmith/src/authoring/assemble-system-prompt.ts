import { stableJson } from "../stable-json";
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
		if (
			source.outputFormat === "text" &&
			typeof example.idealOutput !== "string"
		)
			throw Error(
				`Text prompt ${source.route} requires string demonstrations`,
			);
		const output =
			source.outputFormat === "text"
				? example.idealOutput
				: stableJson(example.idealOutput);
		return `Example ${index + 1}\nInput:\n${stableJson(example.input)}\nIdeal output:\n${output}${explanation}`;
	});
	return `${body}\n\nExamples to follow:\n\n${renderedExamples.join("\n\n")}`;
}
