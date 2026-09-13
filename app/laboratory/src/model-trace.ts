import type { ModelExchange } from "dumgen/types";
import type { ClassificationStageResult } from "./shared/contract";

export function attemptedPromptPaths(
	exchanges: readonly ModelExchange[],
): string[] {
	return exchanges.map(({ request }) => `${request.stage}:${request.route}`);
}
export function operationStage(
	stage: string,
	input: unknown,
	result: unknown,
	exchanges: readonly ModelExchange[],
	origin: "authored" | "supplied" = "authored",
): ClassificationStageResult {
	const exchange = exchanges.findLast(
		(value) => value.request.stage === stage,
	);
	return {
		prompt: exchange ? `${stage}:${exchange.request.route}` : stage,
		traceOrigin: exchange ? "generated" : origin,
		input: exchange?.request.input ?? input,
		output: exchange?.output ?? result,
		result,
	};
}
export function generation(
	exchanges: readonly ModelExchange[],
	cache: "miss" | "member-hit" = "miss",
) {
	return {
		model:
			exchanges.at(-1)?.request.configuration.model ??
			"authored or cached",
		prompts: attemptedPromptPaths(exchanges),
		cache,
		modelCalls: exchanges.length,
	};
}
