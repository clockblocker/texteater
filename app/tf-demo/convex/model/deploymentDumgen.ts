"use node";

import {
	createDumgen,
	createTypeSafeAsk,
	InvalidModelOutput,
	type OperationTrace,
	ProviderFailure,
} from "dumgen";
import * as Effect from "effect/Effect";
import { deploymentLuna } from "../../server/deployment-luna";
import {
	dumgenTracing,
	type InspectionCapture,
} from "../../server/inspectionCapture";
import { INTAKE_NOT_CONFIGURED_MESSAGE } from "../../server/intake";
import { joinedSentence, sentenceParts } from "../../server/longSentences";
import { storedUnitOf } from "../../server/storedSegments";
import { env } from "../_generated/server";
import { visitorError } from "./validators";

/*
 * The deployment's Dumgen instances: intake's, and a click's, at the click
 * deadline.
 */

/** How a Dumgen instance traces: `dumgenTracing`'s options. */
export type DumgenTracing = ReturnType<typeof dumgenTracing>;

/**
 * The production Dumgen for intake: jev through TypeSafe with the
 * deployment's key. With no key, intake fails with a coded error that tells
 * the Visitor how to fix it.
 */
export function productionDumgen(tracing: DumgenTracing) {
	const apiKey = env.TYPESAFE_API_KEY;
	if (!apiKey)
		throw visitorError("NotConfigured", INTAKE_NOT_CONFIGURED_MESSAGE);
	return createDumgen({
		jev: createTypeSafeAsk({ apiKey }),
		...deploymentLuna(env),
		...tracing,
	});
}

/**
 * Each model call's deadline on a click: `CLICK_CALL_DEADLINE_MS`, or
 * intake's 120 s until the first live click measurement sets it (#858).
 */
export function clickCallDeadlineMs(
	value: string | undefined = env.CLICK_CALL_DEADLINE_MS,
): number {
	const deadline = value === undefined ? 120_000 : Number(value);
	if (!Number.isInteger(deadline) || deadline <= 0)
		throw new Error("CLICK_CALL_DEADLINE_MS is a positive whole number");
	return deadline;
}

/**
 * The click's Dumgen instance: jev and Luna at the click deadline. With no
 * TypeSafe key, a click fails with the coded intake error.
 */
export function clickDumgen(tracing: DumgenTracing) {
	const apiKey = env.TYPESAFE_API_KEY;
	if (!apiKey)
		throw visitorError("NotConfigured", INTAKE_NOT_CONFIGURED_MESSAGE);
	const timeoutMs = clickCallDeadlineMs();
	return createDumgen({
		jev: createTypeSafeAsk({ apiKey, timeoutMs }),
		...deploymentLuna(env, timeoutMs),
		...tracing,
	});
}

/**
 * Segments one failed Sentence again for its first click (#861), at the
 * click deadline. When it fails again, the click fails with what its trace
 * says: a ProviderFailure or an InvalidModelOutput.
 */
export const resegmenter =
	(inspection?: InspectionCapture) => (stitchedText: string) =>
		Effect.suspend(() => {
			let failure: OperationTrace["sentences"][number] | undefined;
			const dumgen = clickDumgen(
				dumgenTracing(inspection, (trace) => {
					failure = trace.sentences.find(
						({ outcome }) => outcome === "Failed",
					);
				}),
			);
			// A long Sentence is read in parts, as intake read it.
			const parts = sentenceParts(stitchedText);
			return dumgen.segment
				.inUnits({
					language: "de",
					paragraphs: [{ sentences: [...parts.parts] }],
				})
				.pipe(
					Effect.flatMap((text) => {
						const sentence = joinedSentence(
							text.paragraphs[0]?.sentences ?? [],
							parts,
						);
						if (!sentence.failed)
							return Effect.succeed({
								segments: sentence.segments.map(
									({ kind, text, surface }) =>
										surface === undefined
											? { kind, text }
											: { kind, text, surface },
								),
								units: sentence.units.map(storedUnitOf),
							});
						const reason =
							failure?.outcome === "Failed"
								? failure.failure
								: undefined;
						const fields = {
							stage: "segment.inUnits",
							message:
								reason?.message ??
								"The Sentence was not segmented",
						};
						return Effect.fail(
							reason?.tag === "InvalidModelOutput"
								? new InvalidModelOutput(fields)
								: new ProviderFailure(fields),
						);
					}),
				);
		});
