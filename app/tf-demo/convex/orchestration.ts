"use node";

import { ConvexError, type Infer, type Value, v } from "convex/values";
import { parseScroll, type Scroll } from "dumgen";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import type { ReadingResolution } from "../server/clickResolution";
import { dumgenClickResolution } from "../server/dumgenClickResolution";
import { extractPaste } from "../server/extraction";
import {
	dumgenTracing,
	type InspectionCapture,
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
	fetchPage,
	LINK_REJECTED_MESSAGE,
	readPage,
} from "../server/linkIntake";
import {
	parseGermanLemma,
	parseGermanReading,
} from "../server/operationalParsing";
import type { ResolutionSessionGuard } from "../server/resolutionLifecycle";
import { executeResolutionSession } from "../server/resolutionSessionExecution";
import { projectResolutionReading } from "../server/resolutionSessionProjection";
import { storedUnitOf } from "../server/storedSegments";
import { textSubmissionLimitViolation } from "../server/textSubmissionLimits";
import { submittedLink } from "../shared/submitted-link";
import type { ScrollLanguage } from "../shared/supported-target-language";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type ActionCtx, action, internalAction } from "./_generated/server";
import { inspectionEnabled } from "./deploymentFlags";
import {
	clickDumgen,
	productionDumgen,
	resegmenter,
} from "./model/deploymentDumgen";
import { inspectionFor } from "./model/inspectionAction";
import {
	convexId,
	createResolutionSessionLifecycle,
} from "./model/resolutionSessionLifecycle";
import {
	languageValidator,
	resolutionSessionGuardValidator,
} from "./model/validators";

const submitTextResultValidator = v.union(
	v.object({
		status: v.literal("Accepted"),
		scrollId: v.id("scrolls"),
	}),
	v.object({
		status: v.literal("Rejected"),
		message: v.string(),
	}),
);

type SubmitTextActionResult = Infer<typeof submitTextResultValidator>;

const submitLinkResultValidator = v.union(
	v.object({
		status: v.literal("Accepted"),
		scrollId: v.id("scrolls"),
		/** What the Scroll is called: the article's title, else the link. */
		title: v.string(),
	}),
	v.object({
		status: v.literal("Rejected"),
		message: v.string(),
	}),
);

type SubmitLinkActionResult = Infer<typeof submitLinkResultValidator>;

/**
 * The coded Visitor error behind a failed Effect. Convex sends only a
 * ConvexError thrown as itself to the client, not one wrapped in a failure.
 */
function visitorErrorIn(
	cause: Cause.Cause<unknown>,
): ConvexError<Value> | undefined {
	for (const failure of [
		...cause.reasons.filter(Cause.isFailReason).map(({ error }) => error),
		...cause.reasons.filter(Cause.isDieReason).map(({ defect }) => defect),
	]) {
		const thrown = Cause.isUnknownError(failure) ? failure.cause : failure;
		if (thrown instanceof ConvexError) return thrown;
	}
	return undefined;
}

/** A Scroll from a link, as `persistSubmittedScroll` stores it. */
type LinkedScroll = {
	readonly title?: string;
	readonly url: string;
	readonly original: Id<"_storage">;
	readonly owner: string;
};

/** One Scroll's way through intake, from its Extracted Text. */
type ScrollSubmission = {
	readonly submissionKey: string;
	readonly sourceText: string;
	readonly visitorId: string;
	readonly inspectionVisitorId?: string;
	readonly language: ScrollLanguage;
	/** The stored Extracted Text when it was submitted before, else Extraction's. */
	readonly extractedText: Scroll;
	/** A new Scroll from a link. */
	readonly link?: LinkedScroll;
};

/**
 * Splits, detects, segments and stores one Scroll. Only the text and rate
 * limit violations become Rejected, checked before any model work; every
 * other failure throws.
 */
async function analyzeScroll(
	ctx: ActionCtx,
	submission: ScrollSubmission,
): Promise<SubmitTextActionResult> {
	const { extractedText, language, link } = submission;
	const sentences = sourceSentencesOf(extractedText);
	const limitViolation = textSubmissionLimitViolation(
		submission.sourceText,
		sentences,
	);
	if (limitViolation !== undefined)
		return { status: "Rejected", message: limitViolation };
	// Intake is not deterministic, so re-segmenting a stored Scroll would
	// pay for every jev call and then often disagree with it.
	const analyzed = await ctx.runQuery(
		internal.persistence.analyzedSubmission,
		{
			submissionKey: submission.submissionKey,
			sourceText: submission.sourceText,
		},
	);
	if (analyzed) return { status: "Accepted", scrollId: analyzed };
	const limit = await ctx.runMutation(
		internal.rateLimits.consumeTextSubmission,
		{ visitorId: submission.visitorId },
	);
	if (!limit.ok) return { status: "Rejected", message: limit.message };
	const inspectionVisitorId = inspectionEnabled()
		? submission.inspectionVisitorId
		: undefined;
	const requestId = crypto.randomUUID();
	if (inspectionVisitorId) {
		await ctx.runMutation(internal.resolutionInspection.beginAnalysis, {
			requestId,
			visitorId: inspectionVisitorId,
			sourceText: submission.sourceText,
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
	let attempt: Pick<IntakeRun, "outcome" | "failureTag" | "scrollId"> = {
		outcome: "Accepted",
	};
	try {
		const intake = createIntake({
			dumgen: productionDumgen(dumgenTracing(inspection, run.operation)),
			onSegmenting: run.segmenting,
			persistence: {
				persistSubmittedScroll: (input) =>
					ctx.runMutation(
						internal.persistence.persistSubmittedScroll,
						{
							...input,
							...(link === undefined ? {} : { link }),
							sentences: input.sentences.map((sentence) => ({
								...sentence,
								segments: sentence.segments.map((segment) => ({
									...segment,
								})),
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
		});
		const exit = await Effect.runPromiseExit(
			inspected(
				intake
					.submitText({
						submissionKey: submission.submissionKey,
						sourceText: submission.sourceText,
						extractedText,
						language,
					})
					.pipe(
						Effect.withSpan("Analyze submitted text", {
							...inspectionStep("app/tf-demo · intake", {
								sourceText: submission.sourceText,
							}),
							root: true,
						}),
					),
				inspection,
			),
		);
		// The catch reads every failure and defect, not just the squashed one.
		if (Exit.isFailure(exit)) throw exit.cause;
		state = "Complete";
		const scrollId = convexId<"scrolls">(exit.value.persisted.scrollId);
		attempt = { outcome: "Accepted", scrollId };
		return { status: "Accepted", scrollId };
	} catch (error) {
		const cause = Cause.isCause(error) ? error : Cause.die(error);
		attempt = { outcome: "Failed", failureTag: failureTagOf(cause) };
		throw visitorErrorIn(cause) ?? Cause.squash(cause);
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
				submissionKey: submission.submissionKey,
				...attempt,
				durationMs: performance.now() - start,
				createdAt,
			}),
		);
	}
}

export const submitText = action({
	args: {
		submissionKey: v.string(),
		sourceText: v.string(),
		visitorId: v.string(),
		/**
		 * The Scroll's target language; German when absent, and only German is
		 * read for now. Sentences in other languages become Plain Sentences.
		 */
		language: v.optional(languageValidator),
		inspectionVisitorId: v.optional(v.string()),
	},
	returns: submitTextResultValidator,
	handler: async (ctx, args): Promise<SubmitTextActionResult> => {
		const language = args.language ?? "de";
		const unsupported = unsupportedLanguageMessage(language);
		if (unsupported !== undefined)
			return { status: "Rejected", message: unsupported };
		// A Scroll submitted before re-runs from its stored Extracted Text.
		const stored = await ctx.runQuery(
			internal.persistence.storedExtractedText,
			{ submissionKey: args.submissionKey, sourceText: args.sourceText },
		);
		return analyzeScroll(ctx, {
			...args,
			language,
			extractedText:
				stored === null
					? extractPaste(args.sourceText)
					: parseScroll(stored),
		});
	},
});

/** The title a Scroll's own Heading gives it, if any. */
function headingTitle(scroll: Scroll): string | undefined {
	return scroll.heading?.runs.map(({ text }) => text).join("") || undefined;
}

/**
 * A link Submission (#1196): the page is fetched and read into one Scroll,
 * which is stored with its URL and the fetched page as its Original, and
 * private to the Visitor who added it. A link that gives no article is
 * Rejected before any model work. The same Visitor's same link opens the
 * Scroll they already have, with no fetch.
 */
export const submitLink = action({
	args: {
		link: v.string(),
		visitorId: v.string(),
		inspectionVisitorId: v.optional(v.string()),
	},
	returns: submitLinkResultValidator,
	handler: async (ctx, args): Promise<SubmitLinkActionResult> => {
		const link = submittedLink(args.link);
		if (link === undefined)
			return { status: "Rejected", message: LINK_REJECTED_MESSAGE };
		const submission = {
			submissionKey: `link:v1:${args.visitorId}:${link}`,
			sourceText: link,
			visitorId: args.visitorId,
			...(args.inspectionVisitorId === undefined
				? {}
				: { inspectionVisitorId: args.inspectionVisitorId }),
			language: "de" as const,
		};
		const stored = await ctx.runQuery(
			internal.persistence.storedExtractedText,
			{ submissionKey: submission.submissionKey, sourceText: link },
		);
		if (stored !== null) {
			const extractedText = parseScroll(stored);
			const result = await analyzeScroll(ctx, {
				...submission,
				extractedText,
			});
			return result.status === "Accepted"
				? { ...result, title: headingTitle(extractedText) ?? link }
				: result;
		}
		const page = await fetchPage(link);
		if (page === undefined)
			return { status: "Rejected", message: LINK_REJECTED_MESSAGE };
		const read = readPage(page);
		if (read.status === "Rejected") return read;
		const original = await ctx.storage.store(
			new Blob([page.received.body], { type: page.contentType }),
		);
		try {
			const result = await analyzeScroll(ctx, {
				...submission,
				extractedText: read.scroll,
				link: {
					...(read.title === undefined ? {} : { title: read.title }),
					url: page.received.url,
					original,
					owner: args.visitorId,
				},
			});
			if (result.status === "Rejected")
				await ctx.storage.delete(original);
			return result.status === "Accepted"
				? { ...result, title: read.title ?? link }
				: result;
		} catch (error) {
			await ctx.storage.delete(original);
			throw error;
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
		// Lifecycle hops are promises; they run with the session's services so
		// their spans sit under the session's.
		const session = Effect.flatMap(Effect.context<never>(), (services) =>
			executeResolutionSession({
				identity: guard,
				lifecycle: createResolutionSessionLifecycle(
					ctx,
					guard,
					spanHops(services),
				),
				resolve: (selection, checkpoints, observer, context) =>
					orchestratorFor(ctx, guard, observer, inspection)
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
 * The click orchestrator for one action. Its grammar is Dumgen's
 * `resolve.grammar` (#876) and its Reading Dumgen's `resolve.reading`
 * (#877), judged over the Lemma's stored Readings, which Dumdict finds by
 * the case-folded Lemma identity (#764). Under DEV inspection every
 * Dumgen operation renders as inspection rows, with payloads (#885).
 */
function orchestratorFor(
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
