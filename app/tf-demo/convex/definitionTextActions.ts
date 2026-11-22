"use node";

import { v } from "convex/values";
import { type OperationTrace, operations } from "dumgen";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { storedUnitOf } from "../server/storedSegments";
import { internal } from "./_generated/api";
import { type ActionCtx, internalAction } from "./_generated/server";
import { ConvexActionCtx, runConvexEffect } from "./model/convexEffect";
import { deploymentDumgen, modelTransports } from "./model/deploymentDumgen";
import { stripScrollAnalysisGraph } from "./model/scrollAnalysisStripping";

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
) {
	if (!modelTransports().jev)
		return yield* new DefinitionSegmentationError({
			reason: "MissingJevKey",
		});
	const segmented = yield* operations.segment
		.inUnits({
			language: "de",
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
	| { kind: "Ready" }
	| { kind: "Retracted" }
	| { kind: "Failed" };

const materializeDefinition = Effect.fn("DefinitionText.materialize")(
	function* (ctx: ActionCtx, ownerReadingKey: string) {
		const actionCtx = yield* ConvexActionCtx;
		const runNumber = yield* actionCtx.runMutation(
			internal.definitionTexts.markRunning,
			{ ownerReadingKey },
		);
		if (runNumber === null) return;
		const sync = yield* actionCtx.runQuery(
			internal.definitionTexts.loadSync,
			{ ownerReadingKey },
		);
		if (!sync) return;
		const outcome = yield* Effect.gen(function* (): Effect.fn.Return<
			MaterializeOutcome,
			DefinitionSegmentationError | Cause.UnknownError
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
				);
				yield* actionCtx.runMutation(
					internal.definitionTexts.deleteScrollRows,
					{ ownerReadingKey, scrollId },
				);
			}
			if (sync.definition === undefined) return { kind: "Retracted" };
			if (sync.scrollId && !replace) return { kind: "Ready" };
			if (sync.language !== "de")
				return yield* new DefinitionSegmentationError({
					reason: "UnsupportedLanguage",
					language: sync.language ?? undefined,
				});
			const sentence = yield* segmentDefinition(sync.definition);
			yield* actionCtx.runMutation(
				internal.definitionTexts.persistSegmented,
				{
					ownerReadingKey,
					runNumber,
					definition: sync.definition,
					language: "de",
					stitchedText: sentence.text,
					segments: sentence.segments.map(
						({ kind, text, surface }) =>
							surface === undefined
								? { kind, text }
								: { kind, text, surface },
					),
					units: sentence.units.map(storedUnitOf),
					...(sentence.failed
						? { segmentationFailed: true as const }
						: {}),
				},
			);
			return { kind: "Ready" };
		}).pipe(
			Effect.catchCause((cause) => {
				if (Cause.hasInterruptsOnly(cause)) return Effect.interrupt;
				const squashed = Cause.squash(cause);
				console.error(
					"Definition Text materialization failed",
					Cause.isUnknownError(squashed) ? squashed.cause : squashed,
				);
				return Effect.succeed<MaterializeOutcome>({ kind: "Failed" });
			}),
		);
		yield* actionCtx.runMutation(internal.definitionTexts.settle, {
			ownerReadingKey,
			runNumber,
			outcome,
		});
	},
);

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
	args: { ownerReadingKey: v.string() },
	returns: v.null(),
	handler: async (ctx, { ownerReadingKey }) => {
		await runConvexEffect(
			ctx,
			materializeDefinition(ctx, ownerReadingKey),
			{ traceSink: logFailedSentence },
		);
		return null;
	},
});
