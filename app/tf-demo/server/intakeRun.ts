import type { Infer } from "convex/values";
import type { SegmentCall, SegmentedText } from "dumgen";
import * as Cause from "effect/Cause";
import * as Runtime from "effect/Runtime";
import type { intakeRunValidator } from "../convex/model/intakeRuns";

export type IntakeRun = Infer<typeof intakeRunValidator>;
type SentenceOutcome = IntakeRun["sentences"][number]["segmentation"];

/**
 * The tag a failed submission attempt records: the thrown error's name,
 * never its message, which can quote the Text.
 */
export function failureTagOf(error: unknown): string {
	const cause = Runtime.isFiberFailure(error)
		? error[Runtime.FiberFailureCauseId]
		: Cause.die(error);
	const squashed = Cause.squash(cause);
	const original = Cause.isUnknownException(squashed)
		? squashed.error
		: squashed;
	const name = original instanceof Error ? original.name : "NonErrorThrown";
	return /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/u.test(name) ? name : "Error";
}

/**
 * Collects one submission attempt's summary: every jev request
 * `segment.inUnits` reported through `onCall`, with its tokens and time,
 * and how each Sentence's segmentation ended. It keeps no Text, prompt or
 * answer.
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
		/** `createSegment`'s `onCall`. */
		call(call: SegmentCall) {
			jev.calls++;
			if (call.error !== undefined) jev.failed++;
			jev.inputTokens += call.inputTokens;
			jev.outputTokens += call.outputTokens;
			jev.totalDurationMs += call.durationMs;
			jev.maxDurationMs = Math.max(jev.maxDurationMs, call.durationMs);
		},
		/** How each Sentence came back from `segment.inUnits`, by position. */
		segmented(text: SegmentedText) {
			let position = 0;
			for (const { sentences } of text.paragraphs)
				for (const sentence of sentences)
					outcomes.set(
						position++,
						sentence.failure === undefined ? "Segmented" : "Failed",
					);
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
