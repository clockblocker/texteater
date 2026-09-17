import { createDumgen } from "dumgen";
import type { DumgenOptions } from "dumgen/types";
import { createOpenAIExecutor } from "promptsmith/openai";
import { configurationSchema } from "promptsmith/schemas";
import { createTypeSafeExecutor } from "promptsmith/typesafe";
import type { GenerationEvent } from "./resolutionFailure";

/** Model transport stays behind Dumgen's injected execution boundary. */
export function createProductionDumgen(
	onEvent?: (event: GenerationEvent) => void,
	configuration: Pick<
		DumgenOptions,
		"configuration" | "judgmentConfiguration"
	> = {},
) {
	const execute = createOpenAIExecutor();
	return createDumgen({
		...configuration,
		judge: (request, options) => createTypeSafeExecutor()(request, options),
		onOperation: (trace) =>
			onEvent?.({
				kind: "TraceRecorded",
				traceJson: JSON.stringify(trace),
			}),
		onModelExchange: (exchange) =>
			onEvent?.(
				exchange.failure
					? {
							kind: "AttemptFailed",
							failure: {
								attempts: 1,
								category: "ProviderUnavailable",
								retryable: false,
							},
						}
					: {
							kind: "Succeeded",
							attempt: 1,
							latencyMs: exchange.durationMs,
						},
			),
		execute: async (request) =>
			await execute({
				...request,
				configuration: configurationSchema.parse(request.configuration),
			}),
	});
}
