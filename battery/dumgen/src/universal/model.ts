import { prompts } from "../generated/prompts.js";
import type {
	CallTrace,
	DumgenOptions,
	ModelConfiguration,
	ModelRequest,
} from "../types.js";
import { DumgenFailure } from "./failure.js";
import { contextFor, fingerprint } from "./trace.js";
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
	return async <T>(
		stage: string,
		route: string,
		promptRoute: string,
		schema: string,
		input: unknown,
		signal: AbortSignal,
	): Promise<T> => {
		const systemPrompt = prompts[promptRoute];
		if (!systemPrompt)
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
			outputFormat: "text" as const,
			cachePrompt: true,
			input,
			configuration: effectiveConfiguration(options, route),
			signal,
		};
		return executeGeneration(options, request, (output) =>
			parse<T>(schema, output, stage, true),
		);
	};
}

export async function executeGeneration<T>(
	options: DumgenOptions,
	request: ModelRequest,
	validate: (output: unknown) => T,
	dependsOn?: readonly string[],
): Promise<T> {
	const context = contextFor(request.signal);
	const base = {
		id: `${context.id}:${++context.sequence}`,
		operationId: context.id,
		executor: "Luna" as const,
		request: { ...request, input: structuredClone(request.input) },
		dependsOn: dependsOn ?? context.calls.map((call) => call.id),
		fingerprint: await fingerprint({
			prompt: request.systemPrompt,
			format: request.outputFormat ?? "json",
			...(request.outputSchema ? { schema: request.outputSchema } : {}),
		}),
	};
	const startedAt = Date.now();
	const start = performance.now();
	let response: Awaited<ReturnType<DumgenOptions["execute"]>> | undefined;
	let transport: CallTrace["transport"] = "Failure";
	let validation: CallTrace["validation"] = "NotRun";
	let failure: string | undefined;
	try {
		request.signal.throwIfAborted();
		response = await options.execute(request);
		transport = "Success";
		request.signal.throwIfAborted();
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
		return output;
	} catch (error) {
		failure = error instanceof Error ? error.message : String(error);
		if (request.signal.aborted) {
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
		context.calls.push(exchange);
		options.onModelExchange?.(exchange);
	}
}
