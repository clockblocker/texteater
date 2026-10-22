"use node";

import type { ReadingResolution } from "../../server/clickResolution";
import { dumgenClickResolution } from "../../server/dumgenClickResolution";
import {
	dumgenTracing,
	type InspectionCapture,
} from "../../server/inspectionCapture";
import { lemmaIdentityKey } from "../../server/linguisticIdentity";
import { createTfDemoOrchestrator } from "../../server/linguisticOrchestration";
import {
	parseGermanLemma,
	parseGermanReading,
} from "../../server/operationalParsing";
import type {
	LateResolvedClickCommit,
	OrchestrationPersistence,
	ResolutionContext,
	ResolutionProgressObserver,
	ResolvedClickCommit,
	ResolveSegmentInput,
	ReusedResolvedClickCommit,
	UnresolvedClickCommit,
} from "../../server/orchestrationPorts";
import type { ResolutionSessionGuard } from "../../server/resolutionLifecycle";
import { projectResolutionReading } from "../../server/resolutionSessionProjection";
import { storedUnitOf } from "../../server/storedSegments";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { clickDumgen, resegmenter } from "./deploymentDumgen";
import { convexId } from "./resolutionSessionLifecycle";

/**
 * The click orchestrator for one action. Its grammar is Dumgen's
 * `resolve.grammar` (#876) and its Reading Dumgen's `resolve.reading`
 * (#877), judged over the Lemma's stored Readings, which Dumdict finds by
 * the case-folded Lemma identity (#764). Under DEV inspection every
 * Dumgen operation renders as inspection rows, with payloads (#885).
 */
export function orchestratorFor(
	ctx: ActionCtx,
	sessionGuard: ResolutionSessionGuard | null,
	observer?: ResolutionProgressObserver,
	inspection?: InspectionCapture,
) {
	return createTfDemoOrchestrator({
		resolution: dumgenClickResolution(() =>
			clickDumgen(dumgenTracing(inspection)),
		),
		resegment: resegmenter(inspection),
		findStoredReadings: async (lemma) =>
			(
				await ctx.runQuery(
					internal.dumdictStorage.queries.findStoredReadings,
					{ lemmaKey: lemmaIdentityKey(lemma) },
				)
			).map(parseGermanReading),
		persistence: createConvexPersistence(ctx, sessionGuard),
		...(observer ? { observer } : {}),
	});
}

/**
 * Every Occurrence commit runs under the Resolution Session that asked for it
 * and settles that session in its own transaction (ADR-0004). Scroll submission
 * has no session and makes no commit.
 */
function sessionCommitGuard(
	sessionGuard: ResolutionSessionGuard | null,
): ResolutionSessionGuard {
	if (!sessionGuard) {
		throw new Error("An Occurrence commit needs its Resolution Session.");
	}
	return sessionGuard;
}

function createConvexPersistence(
	ctx: ActionCtx,
	sessionGuard: ResolutionSessionGuard | null,
): OrchestrationPersistence {
	return {
		async loadResolutionContext(input) {
			const context = await ctx.runQuery(
				internal.resolutionContext.load,
				{
					...input,
					sentenceId: convexId<"sentences">(input.sentenceId),
				},
			);
			return {
				...context,
				lemmaCandidates: context.lemmaCandidates.map(
					({ lemma, foundUnder }) => ({
						lemma: parseGermanLemma(lemma),
						foundUnder,
					}),
				),
			} as ResolutionContext;
		},
		async persistResolvedClick(input) {
			const { readingAvailable, succeeded } = input.progress ?? {};
			return ctx.runMutation(internal.persistence.persistResolvedClick, {
				...convexSegmentSelectionArgs(input),
				readingDecision: input.readingDecision,
				...(input.readingCandidates
					? { readingCandidates: [...input.readingCandidates] }
					: {}),
				...(readingAvailable
					? {
							readingAvailable: {
								reading: projectResolutionReading(
									readingAvailable.reading,
								),
								readingCheckpoint: {
									resolution: readingCheckpointOf(
										readingAvailable.readingResolution,
									),
									reading: readingAvailable.reading,
								},
							},
						}
					: {}),
				...(succeeded
					? {
							succeeded: {
								phase: succeeded.phase,
								generationEvents: [
									...succeeded.generationEvents,
								],
							},
						}
					: {}),
				reading: input.reading,
				readingKey: input.readingKey,
				occurrence: {
					...input.occurrence,
					attestation: {
						...input.occurrence.attestation,
						members: input.occurrence.attestation.members.map(
							(member) => ({ ...member }),
						),
					},
					memberSegmentIndices: [
						...input.occurrence.memberSegmentIndices,
					],
				},
				sessionGuard: sessionCommitGuard(sessionGuard),
			}) as Promise<ResolvedClickCommit>;
		},
		async persistReusedResolvedClick(input) {
			return ctx.runMutation(
				internal.persistence.persistReusedResolvedClick,
				{
					...convexSegmentSelectionArgs(input),
					attestationId: input.attestationId as Id<"attestations">,
					sessionGuard: sessionCommitGuard(sessionGuard),
				},
			) as Promise<ReusedResolvedClickCommit>;
		},
		async storeResegmentedSentence(input) {
			return ctx.runMutation(
				internal.persistence.storeResegmentedSentence,
				{
					...convexSegmentSelectionArgs(input),
					segments: input.segments.map((segment) => ({ ...segment })),
					units: input.units.map((unit) => storedUnitOf(unit)),
					sessionGuard: sessionCommitGuard(sessionGuard),
				},
			);
		},
		async persistUnresolvedClick(input) {
			return ctx.runMutation(
				internal.persistence.persistUnresolvedClick,
				{
					...convexSegmentSelectionArgs(input),
					sessionGuard: sessionCommitGuard(sessionGuard),
				},
			) as Promise<UnresolvedClickCommit | LateResolvedClickCommit>;
		},
	};
}

/** A Reading resolution as its checkpoint stores it. */
function readingCheckpointOf({ candidates, ...resolution }: ReadingResolution) {
	return {
		...resolution,
		...(candidates ? { candidates: [...candidates] } : {}),
	};
}

function convexSegmentSelectionArgs(input: ResolveSegmentInput) {
	return {
		requestId: input.requestId,
		visitorId: input.visitorId,
		sentenceId: input.sentenceId as Id<"sentences">,
		clickedSegmentIndex: input.clickedSegmentIndex,
	};
}
