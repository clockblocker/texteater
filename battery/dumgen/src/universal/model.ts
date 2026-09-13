import { modelSchemas } from "../generated/model-schemas.js";
import { prompts } from "../generated/prompts.js";
import type { DumgenOptions, ModelConfiguration } from "../types.js";
import { DumgenFailure } from "./failure.js";
import { parse } from "./validation.js";

export const defaultModelConfiguration: ModelConfiguration = {
	model: "gpt-5.6-luna",
	settings: { reasoning: { effort: "none" } },
};
export function effectiveConfiguration(
	options: DumgenOptions,
	route: string,
): ModelConfiguration {
	const overrides = options.routeOverrides?.[route];
	return {
		model:
			overrides?.model ??
			options.configuration?.model ??
			defaultModelConfiguration.model,
		settings: {
			...defaultModelConfiguration.settings,
			...options.configuration?.settings,
			...overrides?.settings,
		},
	};
}
export function modelCaller(options: DumgenOptions) {
	return async <T>(
		stage: string,
		route: string,
		promptRoute: string,
		schema: string,
		input: unknown,
		signal: AbortSignal,
	): Promise<T> => {
		const systemPrompt = prompts[promptRoute],
			outputSchema = modelSchemas[schema];
		if (!systemPrompt || !outputSchema)
			throw new DumgenFailure(
				"NotImplemented",
				stage,
				"No enabled production route",
				route,
			);
		const request = {
			stage,
			route,
			systemPrompt,
			outputSchema,
			input,
			configuration: effectiveConfiguration(options, route),
			signal,
		};
		const start = performance.now();
		let output: unknown;
		try {
			output = await options.execute(request);
		} catch (error) {
			const failure =
				error instanceof Error ? error.message : String(error);
			options.onModelExchange?.({
				request,
				failure,
				durationMs: performance.now() - start,
			});
			throw new DumgenFailure("ProviderFailure", stage, failure, route);
		}
		options.onModelExchange?.({
			request,
			output,
			durationMs: performance.now() - start,
		});
		return parse<T>(schema, output, stage, true);
	};
}
