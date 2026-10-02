"use node";

import { ConvexError, type Infer, type Value, v } from "convex/values";
import { createSegment, createTypeSafeAsk, type SegmentCall } from "dumgen";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Runtime from "effect/Runtime";
import { selectUnitOnly } from "../server/clickResolution";
import {
	inspected,
	inspectionStep,
	spanHops,
} from "../server/inspectionCapture";
import {
	createIntake,
	sourceSentencesOf,
	unsupportedLanguageMessage,
} from "../server/intake";
import {
	createIntakeRunRecorder,
	failureTagOf,
	type IntakeRun,
	recordIntakeRun,
} from "../server/intakeRun";
import { lemmaIdentityKey } from "../server/linguisticIdentity";
import {
	createTfDemoOrchestrator,
	type LateResolvedClickCommit,
	type OrchestrationPersistence,
	type ResolutionContext,
	type ResolutionProgressObserver,
	type ResolvedClickCommit,
	type ResolveSegmentInput,
	type ReusedResolvedClickCommit,
	type UnresolvedClickCommit,
} from "../server/linguisticOrchestration";
import {
	parseGermanLemma,
	parseGermanReading,
} from "../server/operationalParsing";
import { executeResolutionSession } from "../server/resolutionSessionExecution";
import { textSubmissionLimitViolation } from "../server/textSubmissionLimits";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	type ActionCtx,
	action,
	env,
	internalAction,
} from "./_generated/server";
import { inspectionEnabled } from "./deploymentFlags";
import { inspectionFor } from "./inspectionAction";
import type { ResolutionSessionGuard } from "./model/resolutionSessions";
import {
	languageValidator,
	resolutionSessionGuardValidator,
} from "./model/validators";
import {
	convexId,
	createResolutionSessionLifecycle,
} from "./resolutionSessionLifecycle";

const submitTextResultValidator = v.union(
	v.object({
		status: v.literal("Accepted"),
		textId: v.id("texts"),
	}),
	v.object({
		status: v.literal("Rejected"),
		message: v.string(),
	}),
);

type SubmitTextActionResult = Infer<typeof submitTextResultValidator>;

/**
 * The coded Visitor error behind a failed Effect. Convex sends only a
 * ConvexError thrown as itself to the client, not one wrapped in a failure.
 */
function visitorErrorIn(error: unknown): ConvexError<Value> | undefined {
	const cause = Runtime.isFiberFailure(error)
		? error[Runtime.FiberFailureCauseId]
		: Cause.die(error);
	for (const failure of [...Cause.failures(cause), ...Cause.defects(cause)]) {
		const thrown = Cause.isUnknownException(failure)
			? failure.error
			: failure;
		if (thrown instanceof ConvexError) return thrown;
	}
	return undefined;
}

/** The production jev for intake: TypeSafe with the deployment's key. */
function productionSegment(onCall: (call: SegmentCall) => void) {
	const apiKey = env.TYPESAFE_API_KEY;
	if (!apiKey)
		throw new Error(
			"TYPESAFE_API_KEY is not set, so intake cannot segment the Text.",
		);
	return createSegment({ ask: createTypeSafeAsk({ apiKey }), onCall });
}

export const submitText = action({
	args: {
		submissionKey: v.string(),
		sourceText: v.string(),
		visitorId: v.string(),
		/** The Text's language; German when absent. Only German is read for now. */
		language: v.optional(languageValidator),
		inspectionVisitorId: v.optional(v.string()),
	},
	returns: submitTextResultValidator,
	handler: async (ctx, args): Promise<SubmitTextActionResult> => {
		// Only the language, text and rate limit violations become Rejected,
		// checked here before any model work; every other failure still throws.
		const language = args.language ?? "de";
		const unsupported = unsupportedLanguageMessage(language);
		if (unsupported !== undefined)
			return { status: "Rejected", message: unsupported };
		const sentences = sourceSentencesOf(args.sourceText);
		const limitViolation = textSubmissionLimitViolation(
			args.sourceText,
			sentences,
		);
		if (limitViolation !== undefined)
			return { status: "Rejected", message: limitViolation };
		// Intake is not deterministic, so re-segmenting a stored Text would
		// pay for every jev call and then often disagree with it.
		const analyzed = await ctx.runQuery(
			internal.persistence.analyzedSubmission,
			{ submissionKey: args.submissionKey, sourceText: args.sourceText },
		);
		if (analyzed) return { status: "Accepted", textId: analyzed };
		const limit = await ctx.runMutation(
			internal.rateLimits.consumeTextSubmission,
			{ visitorId: args.visitorId },
		);
		if (!limit.ok) return { status: "Rejected", message: limit.message };
		const inspectionVisitorId = inspectionEnabled()
			? args.inspectionVisitorId
			: undefined;
		const requestId = crypto.randomUUID();
		if (inspectionVisitorId) {
			await ctx.runMutation(internal.resolutionInspection.beginAnalysis, {
				requestId,
				visitorId: inspectionVisitorId,
				sourceText: args.sourceText,
			});
		}
		const inspection = inspectionFor(
			ctx,
			requestId,
			Boolean(inspectionVisitorId),
		);
		const run = createIntakeRunRecorder(sentences.length);
		const createdAt = Date.now();
		const start = performance.now();
		let state: "Complete" | "PermanentFailure" = "PermanentFailure";
		let attempt: Pick<IntakeRun, "outcome" | "failureTag" | "textId"> = {
			outcome: "Accepted",
		};
		try {
			const intake = createIntake({
				segment: productionSegment(run.call),
				persistence: {
					persistSubmittedText: (input) =>
						ctx.runMutation(
							internal.persistence.persistSubmittedText,
							{
								...input,
								sentences: input.sentences.map((sentence) => ({
									...sentence,
									segments: sentence.segments.map(
										(segment) => ({
											...segment,
										}),
									),
									units: sentence.units.map((unit) => ({
										...unit,
										segments: [...unit.segments],
										...(unit.variants
											? { variants: [...unit.variants] }
											: {}),
									})),
								})),
							},
						),
				},
				onSegmented: run.segmented,
			});
			const result = await Effect.runPromise(
				inspected(
					intake
						.submitText({
							submissionKey: args.submissionKey,
							sourceText: args.sourceText,
							language,
						})
						.pipe(
							Effect.withSpan("Analyze submitted text", {
								...inspectionStep("app/tf-demo · intake", {
									sourceText: args.sourceText,
								}),
								root: true,
							}),
						),
					inspection,
				),
			);
			state = "Complete";
			const textId = convexId<"texts">(result.persisted.textId);
			attempt = { outcome: "Accepted", textId };
			return { status: "Accepted", textId };
		} catch (error) {
			attempt = { outcome: "Failed", failureTag: failureTagOf(error) };
			throw visitorErrorIn(error) ?? error;
		} finally {
			await inspection?.flush();
			if (inspectionVisitorId) {
				await ctx.runMutation(
					internal.resolutionInspection.finishAnalysis,
					{ requestId, state },
				);
			}
			await recordIntakeRun(
				(record) => ctx.runMutation(internal.intakeRuns.record, record),
				run.summary({
					runId: requestId,
					submissionKey: args.submissionKey,
					...attempt,
					durationMs: performance.now() - start,
					createdAt,
				}),
			);
		}
	},
});

export const runResolutionSession = internalAction({
	args: {
		...resolutionSessionGuardValidator.fields,
		inspect: v.optional(v.boolean()),
	},
	returns: v.null(),
	handler: async (ctx, { inspect, ...guard }): Promise<null> => {
		const inspection = inspectionFor(
			ctx,
			guard.requestId,
			inspect === true,
		);
		// Lifecycle hops are promises; they run in the session's runtime so
		// their spans sit under the session's.
		const session = Effect.flatMap(Effect.runtime<never>(), (runtime) =>
			executeResolutionSession({
				identity: guard,
				lifecycle: createResolutionSessionLifecycle(
					ctx,
					guard,
					spanHops(runtime),
				),
				resolve: (selection, checkpoints, observer, context) =>
					orchestratorFor(ctx, guard, observer)
						.resolveSegment(selection, checkpoints, context)
						.pipe(
							Effect.withSpan(
								"Resolve selected segment",
								inspectionStep(
									"app/tf-demo · linguisticOrchestration",
									{ selection, checkpoints },
								),
							),
						),
			}),
		).pipe(
			Effect.withSpan("Resolution session", {
				...inspectionStep(
					"app/tf-demo · orchestration.runResolutionSession",
					guard,
				),
				root: true,
			}),
		);
		try {
			await Effect.runPromise(inspected(session, inspection));
		} finally {
			await inspection?.flush();
		}
		return null;
	},
});

/**
 * The click orchestrator for one action. Its ClickResolution is the stub
 * while resolution is rebuilt (#848): a click selects its unit, and no
 * Reading, Knowledge draft or model call follows.
 */
function orchestratorFor(
	ctx: ActionCtx,
	sessionGuard: ResolutionSessionGuard | null,
	observer?: ResolutionProgressObserver,
) {
	return createTfDemoOrchestrator({
		resolution: selectUnitOnly,
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
 * and settles that session in its own transaction (ADR-0004). Text submission
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
			return ctx.runMutation(internal.persistence.persistResolvedClick, {
				...convexSegmentSelectionArgs(input),
				readingDecision: input.readingDecision,
				...(input.knowledgeDraftJson
					? { knowledgeDraftJson: input.knowledgeDraftJson }
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

function convexSegmentSelectionArgs(input: ResolveSegmentInput) {
	return {
		requestId: input.requestId,
		visitorId: input.visitorId,
		sentenceId: input.sentenceId as Id<"sentences">,
		clickedSegmentIndex: input.clickedSegmentIndex,
	};
}
