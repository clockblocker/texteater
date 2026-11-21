import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import type { OnJudged } from "./clickResolution";
import { inspectionStep } from "./inspectionCapture";
import type { ResolutionProgressObserver } from "./orchestrationPorts";

/**
 * What jev judged of a click, saved beside the rest of its Grammar (#1329),
 * so the learner sees the word's class and features while Luna is still
 * writing the headword.
 *
 * - **Never delays the click:** the save runs beside Grammar, and only the
 *   run's ending waits for it, since a Convex write cannot be cancelled.
 * - **Never flashes:** the save is sent a scheduler turn after jev's answer,
 *   and not at all once Grammar has returned by then, as it has when code
 *   writes the headword. A save that still lands after GrammarAvailable is
 *   dropped where it is stored, so the client never sees it after Grammar.
 * - **Never fails the click:** a failed save is logged and leaves the click
 *   as it was.
 */
export type JudgedGrammarSave = {
	/** Dumgen's `onJudged`; none when the run's observer saves no judgment. */
	readonly onJudged: OnJudged | undefined;
	/** Grammar has returned: a judged save not yet sent is not sent. */
	readonly grammarReturned: Effect.Effect<void>;
	/** Waits for a judged save in flight; never fails. */
	readonly landed: Effect.Effect<void>;
};

export function judgedGrammarSave(
	observer: ResolutionProgressObserver | undefined,
): JudgedGrammarSave {
	const grammarJudged = observer?.grammarJudged;
	let returned = false;
	let saving: Fiber.Fiber<void> | undefined;
	const save =
		grammarJudged &&
		((input: Parameters<typeof grammarJudged>[0]) =>
			Effect.yieldNow.pipe(
				Effect.andThen(
					Effect.suspend(() =>
						returned
							? Effect.void
							: Effect.tryPromise(() =>
									grammarJudged.call(observer, input),
								).pipe(
									Effect.withSpan(
										"Save the judged Grammar",
										inspectionStep(
											"app/tf-demo · resolutionSessions",
											input.judged,
										),
									),
								),
					),
				),
				Effect.catchCause((cause) =>
					Effect.logWarning("JudgedGrammarNotSaved", cause),
				),
			));
	return {
		onJudged:
			save &&
			((judged) =>
				Effect.forkDetach(save({ judged }), {
					uninterruptible: true,
				}).pipe(
					Effect.tap((fiber) =>
						Effect.sync(() => {
							saving = fiber;
						}),
					),
					Effect.asVoid,
				)),
		grammarReturned: Effect.sync(() => {
			returned = true;
		}),
		landed: Effect.suspend(() =>
			saving ? Fiber.join(saving) : Effect.void,
		),
	};
}
