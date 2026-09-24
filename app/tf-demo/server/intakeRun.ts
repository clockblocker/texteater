import type { Infer } from "convex/values";
import type { OperationTrace, SentenceOutcome } from "dumgen/types";
import { DumgenFailure } from "dumgen/validation";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as Runtime from "effect/Runtime";
import type { intakeRunValidator } from "../convex/model/intakeRuns";

export type IntakeRun = Infer<typeof intakeRunValidator>;
type SentenceRun = IntakeRun["sentences"][number];
type Stage = IntakeRun["stages"]["segment"];
export type AnalysisOutcome = Pick<SentenceRun, "analysis" | "analysisTag">;

/** A DumgenFailure's tag, or Defect for anything else; undefined when only interrupted. */
function failureTag(cause: Cause.Cause<unknown>): string | undefined {
	if (Cause.isInterruptedOnly(cause)) return undefined;
	const failure = Cause.failureOption(cause);
	const error = Option.isSome(failure) ? failure.value : Cause.squash(cause);
	const original = Cause.originalError(error);
	return original instanceof DumgenFailure ? original._tag : "Defect";
}

/** How one started Sentence Analysis ended. */
export function analysisOutcomeOf(
	exit: Exit.Exit<unknown, unknown>,
): AnalysisOutcome {
	if (Exit.isSuccess(exit)) return { analysis: "Analysed" };
	const tag = failureTag(exit.cause);
	return tag === undefined
		? { analysis: "Interrupted" }
		: { analysis: "Failed", analysisTag: tag };
}

/** How a submission attempt ended, from the error its Effect threw, if any. */
export function attemptOutcomeOf(
	error: unknown,
): Pick<IntakeRun, "outcome" | "failureTag"> {
	const tag = failureTag(
		Runtime.isFiberFailure(error)
			? error[Runtime.FiberFailureCauseId]
			: Cause.die(error),
	);
	return tag === undefined
		? { outcome: "Interrupted" }
		: { outcome: "Failed", failureTag: tag };
}

const emptyStage = (): Stage => ({
	calls: 0,
	failed: 0,
	interrupted: 0,
	totalDurationMs: 0,
	maxDurationMs: 0,
	queueWaitMs: 0,
});

/**
 * Collects one submission attempt's summary: Dumgen's traces give the
 * segmentation outcomes and each stage's calls, the orchestrator gives each
 * Sentence Analysis outcome. It reads outcomes, tags and timings and keeps no
 * payload.
 */
export function createIntakeRunRecorder(sentenceCount: number) {
	const stages = { segment: emptyStage(), analyzeSentence: emptyStage() };
	const segmentation = new Map<number, SentenceOutcome>();
	const analysis = new Map<number, AnalysisOutcome>();
	return {
		/** Dumgen's onOperation. */
		operation(trace: OperationTrace) {
			if (
				trace.operation !== "segment" &&
				trace.operation !== "analyzeSentence"
			)
				return;
			const stage = stages[trace.operation];
			for (const call of trace.calls) {
				stage.calls++;
				if (call.transport === "Interrupted") stage.interrupted++;
				else if (
					call.transport === "Failure" ||
					call.validation === "Invalid"
				)
					stage.failed++;
				stage.totalDurationMs += call.durationMs;
				stage.maxDurationMs = Math.max(
					stage.maxDurationMs,
					call.durationMs,
				);
			}
			for (const { kind, data } of trace.events) {
				if (kind === "RequestQueued")
					stage.queueWaitMs += (data as { waitMs: number }).waitMs;
				if (
					kind === "SentenceOutcome" &&
					trace.operation === "segment"
				) {
					const outcome = data as SentenceOutcome;
					segmentation.set(outcome.index, outcome);
				}
			}
		},
		/** The orchestrator's view of the Sentence Analysis at `position`. */
		analysed(position: number, outcome: AnalysisOutcome) {
			analysis.set(position, outcome);
		},
		summary(
			attempt: Pick<
				IntakeRun,
				| "runId"
				| "submissionKey"
				| "textId"
				| "outcome"
				| "failureTag"
				| "durationMs"
				| "createdAt"
			>,
		): IntakeRun {
			return {
				...attempt,
				sentenceCount,
				sentences: Array.from({ length: sentenceCount }, (_, index) => {
					const segmented = segmentation.get(index) ?? {
						index,
						outcome: "NotStarted" as const,
					};
					// Only accepted German sentences are analysed.
					const analysable =
						segmented.outcome === "Accepted" &&
						segmented.language === "de";
					return {
						segmentation: segmented.outcome,
						...(segmented.language
							? { language: segmented.language }
							: {}),
						...(segmented.tag
							? { segmentationTag: segmented.tag }
							: {}),
						...(analysable
							? (analysis.get(index) ?? {
									analysis: "NotStarted" as const,
								})
							: { analysis: "NotApplicable" as const }),
					};
				}),
				stages,
			};
		},
	};
}

export type IntakeRunRecorder = ReturnType<typeof createIntakeRunRecorder>;

/**
 * Writes the summary best effort: a failed write is logged and never changes
 * the submission's result or error.
 */
export async function recordIntakeRun(
	write: (run: IntakeRun) => Promise<unknown>,
	run: IntakeRun,
): Promise<void> {
	try {
		await write(run);
	} catch (error) {
		console.error(
			`The intake run ${run.runId} could not be recorded.`,
			error,
		);
	}
}
