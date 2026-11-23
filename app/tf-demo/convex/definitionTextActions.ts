"use node";

import { v } from "convex/values";
import { type OperationTrace, operations } from "dumgen";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import {
	annotateInspectionStep,
	inspectionStep,
	markSpanFailed,
	recordFailedStep,
} from "../server/inspectionCapture";
import { storedUnitOf } from "../server/storedSegments";
import {
	isSupportedTargetLanguage,
	type SupportedTargetLanguage,
} from "../shared/supported-target-language";
import { internal } from "./_generated/api";
import { type ActionCtx, internalAction } from "./_generated/server";
import {
	type ConvexActionCtx,
	inspectedMutation,
	runConvexEffect,
} from "./model/convexEffect";
import { deploymentDumgen, modelTransports } from "./model/deploymentDumgen";
import { inspectionFor } from "./model/inspectionAction";
import { stripScrollAnalysisGraph } from "./model/scrollAnalysisStripping";

const OWNER = "app/tf-demo · definitionTextActions";

const DEFINITION_SEGMENTATION_MESSAGES: Record<
	"MissingJevKey" | "UnsupportedLanguage" | "EmptySegmentation",
	string
> = {
	MissingJevKey:
		"TYPESAFE_API_KEY is not set, so the definition cannot be segmented.",
	UnsupportedLanguage: "Only a German Reading's definition is segmented.",
	EmptySegmentation: "The definition yielded no Sentence.",
};

class DefinitionSegmentationError extends Schema.TaggedError<
	DefinitionSegmentationError,
	{ readonly brand: unique symbol }
>()("DefinitionSegmentationError", {
	reason: Schema.Literals([
		"MissingJevKey",
		"UnsupportedLanguage",
		"EmptySegmentation",
	]),
	language: Schema.optional(Schema.String),
}) {
	override get message(): string {
		return DEFINITION_SEGMENTATION_MESSAGES[this.reason];
	}
}

/** Logs why the definition's Sentence failed; only the trace knows. */
function logFailedSentence(trace: OperationTrace) {
	for (const outcome of trace.sentences)
		if (outcome.outcome === "Failed")
			console.warn(
				`The definition was not segmented: ${outcome.failure.tag}: ${outcome.failure.message}`,
			);
}

/**
 * Cuts a German definition into one Sentence's Segments and biggest units
 * with Dumgen's `segment.inUnits`, the definition taken whole as that
 * Sentence: no `splitText`, since a Definition Text holds one Sentence. A
 * Sentence whose segmentation failed comes back marked `failed`, with no
 * units, and is stored so. Segmentation never asks Luna, so it needs no
 * OpenAI key.
 */
const segmentDefinition = Effect.fn("DefinitionText.segment")(function* (
	definition: string,
	language: SupportedTargetLanguage,
) {
	if (!modelTransports().jev)
		return yield* new DefinitionSegmentationError({
			reason: "MissingJevKey",
		});
	const segmented = yield* operations.segment
		.inUnits({
			language,
			paragraphs: [{ sentences: [definition] }],
		})
		.pipe(Effect.provide(deploymentDumgen()));
	const sentence = segmented.paragraphs[0]?.sentences[0];
	if (!sentence)
		return yield* new DefinitionSegmentationError({
			reason: "EmptySegmentation",
		});
	return sentence;
});

type MaterializeOutcome =
	| { kind: "Settled" }
	| { kind: "Ready" }
	| { kind: "Retracted" }
	| { kind: "Failed" };

const materializeDefinition = Effect.fn("Materialize Definition Text", {
	root: true,
})(function* (
	ctx: ActionCtx,
	ownerReadingKey: string,
	inspectRequestId?: string,
) {
	yield* annotateInspectionStep(OWNER, { ownerReadingKey });
	const claimed = yield* inspectedMutation(
		"Claim and load definition",
		OWNER,
		{ ownerReadingKey },
		internal.definitionTexts.begin,
		{ ownerReadingKey },
	);
	if (!claimed) return;
	const { runNumber, sync } = claimed;
	const outcome = yield* Effect.gen(function* (): Effect.fn.Return<
		MaterializeOutcome,
		DefinitionSegmentationError | Cause.UnknownError,
		ConvexActionCtx
	> {
		const replace =
			sync.scrollId !== undefined &&
			sync.materializedDefinition !== sync.definition;
		if (sync.scrollId && replace) {
			const scrollId = sync.scrollId;
			yield* Effect.tryPromise(() =>
				stripScrollAnalysisGraph(ctx, scrollId, {
					protectedReadingKeys: [ownerReadingKey],
				}),
			).pipe(
				Effect.withSpan(
					"Strip previous Definition Text",
					inspectionStep(OWNER, { ownerReadingKey, scrollId }),
				),
			);
			yield* inspectedMutation(
				"Delete previous Definition Text rows",
				OWNER,
				{ ownerReadingKey, scrollId },
				internal.definitionTexts.deleteScrollRows,
				{ ownerReadingKey, scrollId },
			);
		}
		if (sync.definition === undefined) return { kind: "Retracted" };
		if (sync.scrollId && !replace) return { kind: "Ready" };
		if (!isSupportedTargetLanguage(sync.language))
			return yield* new DefinitionSegmentationError({
				reason: "UnsupportedLanguage",
				language: sync.language ?? undefined,
			});
		const sentence = yield* segmentDefinition(
			sync.definition,
			sync.language,
		);
		if (sentence.failed) yield* markSpanFailed;
		const persistArgs = {
			ownerReadingKey,
			runNumber,
			definition: sync.definition,
			language: sync.language,
			stitchedText: sentence.text,
			segments: sentence.segments.map(({ kind, text, surface }) =>
				surface === undefined
					? { kind, text }
					: { kind, text, surface },
			),
			units: sentence.units.map(storedUnitOf),
			...(sentence.failed ? { segmentationFailed: true as const } : {}),
		};
		const persisted = yield* inspectedMutation(
			"Persist segmented definition",
			OWNER,
			persistArgs,
			internal.definitionTexts.persistSegmented,
			persistArgs,
		);
		// `persistSegmented` already wrote state "Ready" and cleared
		// `interruptedRuns`; only a Stale write (definition changed mid-run)
		// needs `settle` to reschedule.
		return persisted === "Ready" ? { kind: "Settled" } : { kind: "Ready" };
	}).pipe(
		Effect.catchCause((cause) => {
			if (Cause.hasInterruptsOnly(cause)) return Effect.interrupt;
			const squashed = Cause.squash(cause);
			const error = Cause.isUnknownError(squashed)
				? squashed.cause
				: squashed;
			console.error("Definition Text materialization failed", error);
			return recordFailedStep(
				"Definition segmentation failed",
				OWNER,
				{ ownerReadingKey },
				error,
			).pipe(Effect.as<MaterializeOutcome>({ kind: "Failed" }));
		}),
	);
	if (outcome.kind === "Settled") return;
	const settleArgs = {
		ownerReadingKey,
		runNumber,
		outcome,
		...(inspectRequestId ? { inspectRequestId } : {}),
	};
	yield* inspectedMutation(
		"Settle definition materialization",
		OWNER,
		settleArgs,
		internal.definitionTexts.settle,
		settleArgs,
	);
});

/**
 * Brings one Reading's Definition Text in line with its Knowledge: strips and
 * removes the previous Definition Text when the definition changed or was
 * retracted, then segments and persists the requested one. Segmentation
 * skips text submission, so the defined Reading's language is taken as
 * given; only German is segmented. A definition that changed while this
 * ran is picked up by the run `settle` schedules, and a run that dies
 * before settling by the watchdog its scheduling set.
 */
export const materialize = internalAction({
	args: {
		ownerReadingKey: v.string(),
		inspectRequestId: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { ownerReadingKey, inspectRequestId }) => {
		const inspection = inspectRequestId
			? inspectionFor(ctx, inspectRequestId, true, "DefinitionText")
			: undefined;
		await runConvexEffect(
			ctx,
			materializeDefinition(ctx, ownerReadingKey, inspectRequestId),
			{ inspection, traceSink: logFailedSentence },
		);
		return null;
	},
});
