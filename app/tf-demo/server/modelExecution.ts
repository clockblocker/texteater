import { createDumgen, draftKnowledge } from "dumgen";
import type { DumgenOptions } from "dumgen/types";
import { createOpenAIExecutor } from "promptsmith/openai";
import { configurationSchema } from "promptsmith/schemas";
import { createTypeSafeExecutor } from "promptsmith/typesafe";
import type { InspectionCapture } from "./inspectionCapture";
import type { GenerationEvent } from "./resolutionFailure";

/** Model transport stays behind Dumgen's injected execution boundary. */
export function createProductionDumgen(
	onEvent?: (event: GenerationEvent) => void,
	configuration: Pick<
		DumgenOptions,
		| "configuration"
		| "judgmentConfiguration"
		| "onKnowledgeContribution"
		| "knowledgeDraft"
	> = {},
	inspection?: InspectionCapture,
) {
	return createDumgen(productionOptions(onEvent, configuration, inspection));
}

export function createProductionKnowledgeDraft(
	input: Parameters<typeof draftKnowledge>[1],
	inspection?: InspectionCapture,
) {
	return draftKnowledge(productionOptions(undefined, {}, inspection), input);
}

function productionOptions(
	onEvent: ((event: GenerationEvent) => void) | undefined,
	configuration: Partial<DumgenOptions>,
	inspection?: InspectionCapture,
): DumgenOptions {
	const execute = createOpenAIExecutor();
	return {
		...configuration,
		judge: (request, options) => createTypeSafeExecutor()(request, options),
		onOperation: (trace) => {
			inspection?.operation(trace);
			onEvent?.({
				kind: "TraceRecorded",
				traceJson: JSON.stringify(trace),
			});
			for (const call of trace.calls) {
				if (call.transport === "Interrupted") continue;
				onEvent?.(
					call.transport === "Failure" ||
						call.validation === "Invalid"
						? {
								kind: "AttemptFailed",
								failure: {
									attempts: 1,
									category:
										call.validation === "Invalid"
											? "InvalidOutput"
											: "ProviderUnavailable",
									retryable: false,
								},
							}
						: {
								kind: "Succeeded",
								attempt: 1,
								latencyMs: call.durationMs,
							},
				);
			}
		},
		execute: async (request) =>
			await execute({
				...request,
				configuration: configurationSchema.parse(request.configuration),
			}),
	};
}
