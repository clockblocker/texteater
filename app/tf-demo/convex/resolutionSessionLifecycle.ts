import type { SentenceAnalysis } from "dumgen/types";
import type { InspectionCapture } from "../server/inspectionCapture";
import type { ResolutionContext } from "../server/linguisticOrchestration";
import {
	parseGermanLemma,
	parseGermanReading,
} from "../server/operationalParsing";
import type {
	ResolutionSessionLifecyclePort,
	ResolutionSessionRunInput,
} from "../server/resolutionSessionExecution";
import { fromStoredSentenceAnalysis } from "../server/sentenceAnalysisStorage";
import { internal } from "./_generated/api";
import type { Id, TableNames } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import {
	resolvedGrammaticalActionResult,
	resolvedGrammaticalCheckpoint,
} from "./model/grammarCheckpoint";
import {
	projectResolutionGrammar,
	projectResolutionReading,
	type ResolutionSessionGuard,
} from "./model/resolutionSessions";

const OWNER = "app/tf-demo · resolutionSessions";

function convexId<TableName extends TableNames>(value: string): Id<TableName> {
	return value as Id<TableName>;
}

/**
 * The Convex adapter for one guarded Resolution Session run.
 *
 * Every lifecycle event maps to at most one mutation hop. Route availability
 * is published when the run is claimed and terminal progress is published by
 * the commit itself, so those two events are free and are neither sent nor
 * traced. When an inspection capture is supplied, each real hop is timed
 * where it is made, under a label derived from the event.
 */
export function createResolutionSessionLifecycle(
	ctx: ActionCtx,
	guard: ResolutionSessionGuard,
	inspection?: InspectionCapture,
): ResolutionSessionLifecyclePort {
	function hop<T>(
		name: string,
		input: unknown,
		run: () => Promise<T>,
	): Promise<T> {
		return inspection ? inspection.promise(name, OWNER, input, run) : run();
	}
	return {
		begin: () =>
			hop("Load checkpoints and start run", {}, async () => {
				const input = await ctx.runMutation(
					internal.resolutionSessions.beginRun,
					{ guard },
				);
				if (!input) return null;
				const { recorded, reusable, sentence } = input.context;
				// Convex stores masses as `[{key, share}]`; the selector reads records.
				const analysis: SentenceAnalysis | null = input.context.analysis
					? fromStoredSentenceAnalysis(input.context.analysis)
					: null;
				const restored: ResolutionSessionRunInput = {
					selection: input.selection,
					context: {
						// Recorded and reusable Readings are loosely typed at the
						// Convex boundary; parsing them is separate work.
						...({ recorded, reusable } as Pick<
							ResolutionContext,
							"recorded" | "reusable"
						>),
						sentence,
						lemmaCandidates: input.context.lemmaCandidates.map(
							({ lemma, foundUnder }) => ({
								lemma: parseGermanLemma(lemma),
								foundUnder,
							}),
						),
						analysis,
					},
					checkpoints: {
						...(input.checkpoints.grammatical
							? {
									grammatical: resolvedGrammaticalCheckpoint(
										input.checkpoints.grammatical,
									),
								}
							: {}),
						...(input.checkpoints.reading
							? {
									reading: {
										resolution:
											input.checkpoints.reading
												.resolution,
										reading: parseGermanReading(
											input.checkpoints.reading.reading,
										),
									},
								}
							: {}),
					},
				};
				return restored;
			}),
		advance: async (event) => {
			switch (event.progress) {
				case "RouteAvailable":
					return;
				case "GrammarAvailable":
					await hop(`Save ${event.progress}`, event, () =>
						ctx.runMutation(internal.resolutionSessions.advance, {
							guard,
							progress: event.progress,
							grammar: projectResolutionGrammar(
								event.grammatical,
							),
							grammaticalCheckpoint:
								resolvedGrammaticalActionResult(
									event.grammatical,
								),
						}),
					);
					return;
				case "ReadingAvailable":
					await hop(`Save ${event.progress}`, event, () =>
						ctx.runMutation(internal.resolutionSessions.advance, {
							guard,
							progress: event.progress,
							reading: projectResolutionReading(event.reading),
							readingCheckpoint: {
								resolution: event.readingResolution,
								reading: event.reading,
							},
						}),
					);
			}
		},
		settle: (result) =>
			hop(`Settle ${result.kind}`, result, async () => {
				if (result.kind === "CatalogMiss") {
					await ctx.runMutation(
						internal.catalogGrowthSignals
							.recordAndSettleCatalogMiss,
						{ guard, miss: result.miss },
					);
					return;
				}
				await ctx.runMutation(
					internal.resolutionSessions.settleAfterRun,
					result.kind === "Complete"
						? {
								guard,
								result: {
									kind: "Complete",
									attestationId: convexId<"attestations">(
										result.attestationId,
									),
								},
							}
						: { guard, result },
				);
			}),
		record: (record) => {
			if (record.kind !== "Succeeded") inspection?.markFailed();
			return hop(`Record ${record.kind}`, record, async () => {
				switch (record.kind) {
					case "Succeeded":
						await ctx.runMutation(
							internal.resolutionSessions.recordRunSuccess,
							{
								guard,
								phase: record.phase,
								generationEvents: [...record.generationEvents],
							},
						);
						return;
					case "GenerationFailed":
						await ctx.runMutation(
							internal.resolutionSessions.recordRunFailure,
							{
								guard,
								failure: {
									kind: "Generation",
									phase: record.phase,
									failure: record.failure,
									generationEvents: [
										...record.generationEvents,
									],
								},
							},
						);
						return;
					case "InternalFailed":
						await ctx.runMutation(
							internal.resolutionSessions.recordRunFailure,
							{
								guard,
								failure: {
									kind: "Internal",
									phase: record.phase,
									diagnosticId: record.diagnosticId,
									errorName: record.errorName,
									errorFingerprint: record.errorFingerprint,
									generationEvents: [
										...record.generationEvents,
									],
								},
							},
						);
				}
			});
		},
	};
}
