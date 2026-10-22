"use node";

import { ConvexError, type Infer, type Value, v } from "convex/values";
import type { Scroll } from "dumgen";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import {
	dumgenTracing,
	inspected,
	inspectionStep,
} from "../../server/inspectionCapture";
import { createIntake, sourceSentencesOf } from "../../server/intake";
import {
	createIntakeRunRecorder,
	failureTagOf,
	type IntakeRun,
	recordIntakeRun,
} from "../../server/intakeRun";
import { logged } from "../../server/logging";
import { textSubmissionLimitViolation } from "../../server/textSubmissionLimits";
import type { ScrollLanguage } from "../../shared/supported-target-language";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { inspectionEnabled } from "../deploymentFlags";
import { productionDumgen } from "./deploymentDumgen";
import { inspectionFor } from "./inspectionAction";
import { convexId } from "./resolutionSessionLifecycle";

export const submitTextResultValidator = v.union(
	v.object({
		status: v.literal("Accepted"),
		scrollId: v.id("scrolls"),
	}),
	v.object({
		status: v.literal("Rejected"),
		message: v.string(),
	}),
);

export type SubmitTextActionResult = Infer<typeof submitTextResultValidator>;

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
export async function analyzeScroll(
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
						logged,
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
