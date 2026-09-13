import { createDumgen } from "dumgen";
import { createOpenAIExecutor } from "promptsmith/openai";
import { configurationSchema } from "promptsmith/schemas";
import type { GenerationEvent } from "./resolutionFailure";

/** Model transport stays behind Dumgen's injected execution boundary. */
export function createProductionDumgen(
	onEvent?: (event: GenerationEvent) => void,
) {
	const execute = createOpenAIExecutor();
	return createDumgen({
		onModelExchange: (exchange) =>
			onEvent?.(
				exchange.failure
					? {
							kind: "AttemptFailed",
							failure: {
								attempts: 1,
								category: "ProviderUnavailable",
								retryable: true,
							},
						}
					: {
							kind: "Succeeded",
							attempt: 1,
							latencyMs: exchange.durationMs,
						},
			),
		execute: async (request) =>
			(
				await execute({
					...request,
					configuration: configurationSchema.parse(
						request.configuration,
					),
				})
			).output,
	});
}
