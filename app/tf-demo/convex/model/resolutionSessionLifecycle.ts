import type { Infer } from "convex/values";
import { parseLemma, parseReading } from "../../server/operationalParsing";
import type { ResolutionContext } from "../../server/orchestrationPorts";
import type { ResolutionSessionGuard } from "../../server/resolutionLifecycle";
import type {
	ResolutionSessionLifecyclePort,
	ResolutionSessionRunInput,
} from "../../server/resolutionSessionExecution";
import {
	projectJudgedGrammar,
	projectResolutionGrammar,
} from "../../server/resolutionSessionProjection";
import { internal } from "../_generated/api";
import type { Id, TableNames } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import type { resolutionContextValidator } from "../resolutionContext";
import {
	resolvedGrammaticalActionResult,
	resolvedGrammaticalCheckpoint,
} from "./grammarCheckpoint";

/** Brands an ID string a server port handed back as a Convex document ID. */
export function convexId<TableName extends TableNames>(
	value: string,
): Id<TableName> {
	return value as Id<TableName>;
}

/**
 * A Resolution Context as `resolutionContext.load` or `beginRun` returns it,
 * its Lemma candidates parsed: the click's, and the one a batch asks a click's
 * Luna request ahead from (#1351).
 */
export function parsedResolutionContext(
	context: Infer<typeof resolutionContextValidator>,
): ResolutionContext {
	return {
		...context,
		lemmaCandidates: context.lemmaCandidates.map(
			({ lemma, foundUnder }) => ({
				lemma: parseLemma(lemma),
				foundUnder,
			}),
		),
	} as ResolutionContext;
}

/**
 * The Convex adapter for one guarded Resolution Session run.
 *
 * Every lifecycle event maps to one mutation hop. Route availability is
 * published when `begin` claims the run, and Reading availability and terminal
 * progress by the commit itself. Inspection spans wrap these calls on the
 * Effect side (`resolutionSessionExecution`, `linguisticOrchestration`, and
 * `judgedGrammarSave`).
 */
export function createResolutionSessionLifecycle(
	ctx: ActionCtx,
	guard: ResolutionSessionGuard,
): ResolutionSessionLifecyclePort {
	return {
		async begin() {
			const input = await ctx.runMutation(
				internal.resolutionSessions.beginRun,
				{ guard },
			);
			if (!input) return null;
			const restored: ResolutionSessionRunInput = {
				selection: input.selection,
				context: parsedResolutionContext(input.context),
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
										input.checkpoints.reading.resolution,
									reading: parseReading(
										input.checkpoints.reading.reading,
									),
								},
							}
						: {}),
				},
			};
			return restored;
		},
		async advance(event) {
			await ctx.runMutation(internal.resolutionSessions.advance, {
				guard,
				progress: event.progress,
				grammar: projectResolutionGrammar(event.grammatical),
				grammaticalCheckpoint: resolvedGrammaticalActionResult(
					event.grammatical,
				),
			});
		},
		async saveJudged(judged) {
			await ctx.runMutation(internal.resolutionSessions.saveJudged, {
				guard,
				judged: projectJudgedGrammar(judged),
			});
		},
		async settle(result) {
			await ctx.runMutation(
				internal.catalogGrowthSignals.recordAndSettleCatalogMiss,
				{ guard, miss: result.miss },
			);
		},
		async record(record) {
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
								generationEvents: [...record.generationEvents],
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
								generationEvents: [...record.generationEvents],
							},
						},
					);
			}
		},
	};
}
