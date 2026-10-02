import type { Infer } from "convex/values";
import type { OperationTrace } from "dumgen";
import * as Cause from "effect/Cause";
import type { intakeRunValidator } from "../convex/model/intakeRuns";

export type IntakeRun = Infer<typeof intakeRunValidator>;
type SentenceOutcome = IntakeRun["sentences"][number]["segmentation"];

/**
 * The tag a failed submission attempt records: the name of the error its
 * failure squashes to, never its message, which can quote the Text.
 */
export function failureTagOf(cause: Cause.Cause<unknown>): string {
	const squashed = Cause.squash(cause);
	const original = Cause.isUnknownError(squashed) ? squashed.cause : squashed;
	const name = original instanceof Error ? original.name : "NonErrorThrown";
	return /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/u.test(name) ? name : "Error";
}

/**
 * Collects one submission attempt's summary from the trace of its
 * `segment.inUnits`: every jev call with its tokens and time, and how each
 * Sentence's segmentation ended. It keeps no Text, prompt or answer.
 */
export function createIntakeRunRecorder(sentenceCount: number) {
	const jev: IntakeRun["jev"] = {
		calls: 0,
		failed: 0,
		inputTokens: 0,
		outputTokens: 0,
		totalDurationMs: 0,
		maxDurationMs: 0,
	};
	const outcomes = new Map<number, SentenceOutcome>();
	return {
		/** `createDumgen`'s `onOperation`. A Sentence's index is its position. */
		operation(trace: OperationTrace) {
			if (trace.operation !== "segment.inUnits") return;
			for (const call of trace.calls) {
				if (call.executor !== "jev") continue;
				jev.calls++;
				if (call.failure !== undefined) jev.failed++;
				jev.inputTokens += call.inputTokens;
				jev.outputTokens += call.outputTokens;
				jev.totalDurationMs += call.durationMs;
				jev.maxDurationMs = Math.max(
					jev.maxDurationMs,
					call.durationMs,
				);
			}
			for (const { sentence, outcome } of trace.sentences)
				outcomes.set(sentence, outcome);
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
				sentences: Array.from(
					{ length: sentenceCount },
					(_, index) => ({
						segmentation: outcomes.get(index) ?? "NotStarted",
					}),
				),
				jev: { ...jev },
			};
		},
	};
}

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
