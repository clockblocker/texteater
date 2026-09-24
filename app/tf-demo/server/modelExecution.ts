import { createDumgen, draftKnowledge } from "dumgen";
import type { DumgenOptions } from "dumgen/types";
import { createOpenAIExecutor } from "promptsmith/openai";
import { configurationSchema } from "promptsmith/schemas";
import { createTypeSafeExecutor } from "promptsmith/typesafe";
import type { InspectionCapture } from "./inspectionCapture";
import type { GenerationEvent } from "./resolutionFailure";

/**
 * Bounds one Luna request so a provider stall settles as a ProviderFailure,
 * never a retry (#445). Above the slowest recorded success (20.8 s).
 */
export const LUNA_DEADLINE_MS = 30_000;

/**
 * Test seam: the promptsmith transport and its deadline. `settle` ends the
 * calls still in flight early, the way the deadline does.
 */
export type LunaTransport = Parameters<typeof createOpenAIExecutor>[0] & {
	readonly deadlineMs?: number;
	readonly settle?: AbortSignal;
};

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
	transport?: LunaTransport,
) {
	return createDumgen(
		productionOptions(onEvent, configuration, inspection, transport),
	);
}

export function createProductionKnowledgeDraft(
	input: Parameters<typeof draftKnowledge>[1],
	inspection?: InspectionCapture,
	transport?: LunaTransport,
) {
	return draftKnowledge(
		productionOptions(undefined, {}, inspection, transport),
		input,
	);
}

function productionOptions(
	onEvent: ((event: GenerationEvent) => void) | undefined,
	configuration: Partial<DumgenOptions>,
	inspection?: InspectionCapture,
	{ deadlineMs = LUNA_DEADLINE_MS, settle, ...transport }: LunaTransport = {},
): DumgenOptions {
	const execute = createOpenAIExecutor(transport);
	return {
		...configuration,
		judge: (request, options) => createTypeSafeExecutor()(request, options),
		onOperation: (dumgenTrace) => {
			// The deadline is host transport policy, so the host records it as evidence.
			const trace = {
				...dumgenTrace,
				generationConfiguration: {
					...dumgenTrace.generationConfiguration,
					settings: {
						...dumgenTrace.generationConfiguration.settings,
						deadlineMs,
					},
				},
			};
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
		execute: async (request) => {
			// request.signal is Dumgen's interruption; only the transport sees the deadline.
			const deadline = AbortSignal.timeout(deadlineMs);
			try {
				return await execute({
					...request,
					configuration: configurationSchema.parse(
						request.configuration,
					),
					signal: AbortSignal.any([
						request.signal,
						deadline,
						...(settle ? [settle] : []),
					]),
				});
			} catch (error) {
				if (settle?.aborted && !request.signal.aborted)
					throw Error(
						"DraftSettled: the Reading committed without this leaf",
						{ cause: error },
					);
				if (deadline.aborted && !request.signal.aborted)
					throw Error(
						`LunaDeadlineExceeded: no response within ${deadlineMs} ms`,
						{ cause: error },
					);
				throw error;
			}
		},
	};
}
