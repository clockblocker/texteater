import * as Effect from "effect/Effect";
import { prompts } from "../generated/prompts.js";
import type { DumgenOptions, ModelRequest } from "../types.js";
import { DumgenFailure } from "./failure.js";
import { effectiveConfiguration } from "./model-configuration.js";
import { type Called, call, type OperationScope } from "./trace.js";
import { parse } from "./validation.js";

export function textModelCaller(options: DumgenOptions) {
	return <T>(
		scope: OperationScope,
		stage: string,
		route: string,
		promptRoute: string,
		schema: string,
		input: unknown,
		dependsOn: readonly string[],
	): Effect.Effect<Called<T>, DumgenFailure> => {
		const systemPrompt = prompts[promptRoute];
		if (!systemPrompt)
			return Effect.fail(
				new DumgenFailure(
					"NotImplemented",
					stage,
					"No enabled production route",
					route,
				),
			);
		return executeGeneration(
			options,
			scope,
			{
				stage,
				route,
				systemPrompt,
				outputFormat: "text",
				cachePrompt: true,
				input,
				configuration: effectiveConfiguration(options, route),
			},
			(output) => parse<T>(schema, output, stage, true),
			dependsOn,
		);
	};
}

type WithoutSignal<R> = R extends unknown ? Omit<R, "signal"> : never;
/** The request a call sends; the call supplies the transport's signal. */
export type GenerationRequest = WithoutSignal<ModelRequest>;

export function executeGeneration<T>(
	options: DumgenOptions,
	scope: OperationScope,
	unsent: GenerationRequest,
	validate: (output: unknown) => T,
	dependsOn: readonly string[],
): Effect.Effect<Called<T>, DumgenFailure> {
	return call(options, scope, {
		executor: "Luna",
		dependsOn,
		fingerprinted: {
			prompt: unsent.systemPrompt,
			format: unsent.outputFormat ?? "json",
			...(unsent.outputSchema ? { schema: unsent.outputSchema } : {}),
		},
		request: (signal) =>
			({
				...unsent,
				input: structuredClone(unsent.input),
				signal,
			}) as ModelRequest,
		send: (request) => options.execute(request),
		evidence: (response) =>
			response
				? { output: response.output, metadata: response.metadata }
				: {},
		validate: (response) => {
			if (
				!response ||
				typeof response !== "object" ||
				!("output" in response)
			)
				throw new DumgenFailure(
					"InvalidModelOutput",
					unsent.stage,
					"Generation executor omitted its output envelope",
					unsent.route,
				);
			return validate(response.output);
		},
	});
}
