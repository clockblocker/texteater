import * as Effect from "effect/Effect";
import { prompts } from "../generated/prompts.js";
import type {
	CallTrace,
	DumgenOptions,
	ModelConfiguration,
	ModelRequest,
} from "../types.js";
import { DumgenFailure } from "./failure.js";
import {
	type Called,
	call,
	fingerprint,
	type OperationScope,
} from "./trace.js";
import { parse } from "./validation.js";

export const defaultModelConfiguration: ModelConfiguration = {
	model: "gpt-5.6-luna",
	settings: { reasoning: { effort: "none" }, service_tier: "fast" },
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
	return call(async (signal) => {
		const request = { ...unsent, signal } as ModelRequest;
		const base = {
			id: `${scope.id}:${++scope.sequence}`,
			operationId: scope.id,
			executor: "Luna" as const,
			request: { ...request, input: structuredClone(request.input) },
			dependsOn,
			fingerprint: await fingerprint({
				prompt: request.systemPrompt,
				format: request.outputFormat ?? "json",
				...(request.outputSchema
					? { schema: request.outputSchema }
					: {}),
			}),
		};
		const startedAt = Date.now();
		const start = performance.now();
		let response: Awaited<ReturnType<DumgenOptions["execute"]>> | undefined;
		let transport: CallTrace["transport"] = "Failure";
		let validation: CallTrace["validation"] = "NotRun";
		let failure: string | undefined;
		try {
			signal.throwIfAborted();
			response = await options.execute(request);
			transport = "Success";
			signal.throwIfAborted();
			validation = "Invalid";
			if (
				!response ||
				typeof response !== "object" ||
				!("output" in response)
			)
				throw new DumgenFailure(
					"InvalidModelOutput",
					request.stage,
					"Generation executor omitted its output envelope",
					request.route,
				);
			const output = validate(response.output);
			validation = "Valid";
			return { id: base.id, output };
		} catch (error) {
			failure = error instanceof Error ? error.message : String(error);
			if (signal.aborted) {
				transport = "Interrupted";
				throw error;
			}
			// The executor is the transport boundary. After it succeeds, output
			// checks raise DumgenFailures and any other throw is a defect.
			if (transport !== "Success")
				throw new DumgenFailure(
					"ProviderFailure",
					request.stage,
					failure,
					request.route,
				);
			throw error;
		} finally {
			const exchange: CallTrace = {
				...base,
				transport,
				validation,
				...(response
					? { output: response.output, metadata: response.metadata }
					: {}),
				...(failure ? { failure } : {}),
				startedAt,
				durationMs: performance.now() - start,
			};
			scope.calls.push(exchange);
			options.onModelExchange?.(exchange);
		}
	});
}
