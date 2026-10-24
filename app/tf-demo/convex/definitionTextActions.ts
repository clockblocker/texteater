"use node";

import { v } from "convex/values";
import { type OperationTrace, operations, TraceSink } from "dumgen";
import * as Effect from "effect/Effect";
import { logged } from "../server/logging";
import { storedUnitOf } from "../server/storedSegments";
import {
	isSupportedTargetLanguage,
	type SupportedTargetLanguage,
} from "../shared/supported-target-language";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { deploymentDumgen, modelTransports } from "./model/deploymentDumgen";
import { stripScrollAnalysisGraph } from "./model/scrollAnalysisStripping";

/** Logs why the definition's Sentence failed; only the trace knows. */
function logFailedSentence(trace: OperationTrace) {
	for (const outcome of trace.sentences)
		if (outcome.outcome === "Failed")
			console.warn(
				`The definition was not segmented: ${outcome.failure.tag}: ${outcome.failure.message}`,
			);
}

/**
 * Cuts a supported-language definition into one Sentence's Segments and biggest units
 * with Dumgen's `segment.inUnits`, the definition taken whole as that
 * Sentence: no `splitText`, since a Definition Text holds one Sentence. A
 * Sentence whose segmentation failed comes back marked `failed`, with no
 * units, and is stored so. Segmentation never asks Luna, so it needs no
 * OpenAI key.
 */
async function segmentDefinition(
	definition: string,
	language: SupportedTargetLanguage,
) {
	if (!modelTransports().jev)
		throw new Error(
			"TYPESAFE_API_KEY is not set, so the definition cannot be segmented.",
		);
	const segmented = await Effect.runPromise(
		operations.segment
			.inUnits({
				language,
				paragraphs: [{ sentences: [definition] }],
			})
			.pipe(
				logged,
				Effect.provideService(TraceSink, logFailedSentence),
				Effect.provide(deploymentDumgen()),
			),
	);
	const sentence = segmented.paragraphs[0]?.sentences[0];
	if (!sentence) throw new Error("The definition yielded no Sentence.");
	return sentence;
}

/**
 * Brings one Reading's Definition Text in line with its Knowledge: strips and
 * removes the previous Definition Text when the definition changed or was
 * retracted, then segments and persists the requested one. Segmentation
 * skips text submission, so the defined Reading's language is taken as
 * given; only supported target languages are segmented. A definition that changed while this
 * ran is picked up by the run `settle` schedules, and a run that dies
 * before settling by the watchdog its scheduling set.
 */
export const materialize = internalAction({
	args: { ownerReadingKey: v.string() },
	returns: v.null(),
	handler: async (ctx, { ownerReadingKey }) => {
		const runNumber = await ctx.runMutation(
			internal.definitionTexts.markRunning,
			{ ownerReadingKey },
		);
		if (runNumber === null) return null;
		const sync = await ctx.runQuery(internal.definitionTexts.loadSync, {
			ownerReadingKey,
		});
		if (!sync) return null;
		let outcome:
			| { kind: "Ready" }
			| { kind: "Retracted" }
			| { kind: "Failed" };
		try {
			const replace =
				sync.scrollId !== undefined &&
				sync.materializedDefinition !== sync.definition;
			if (sync.scrollId && replace) {
				await stripScrollAnalysisGraph(ctx, sync.scrollId, {
					protectedReadingKeys: [ownerReadingKey],
				});
				await ctx.runMutation(
					internal.definitionTexts.deleteScrollRows,
					{
						ownerReadingKey,
						scrollId: sync.scrollId,
					},
				);
			}
			if (sync.definition === undefined) {
				outcome = { kind: "Retracted" };
			} else if (sync.scrollId && !replace) {
				outcome = { kind: "Ready" };
			} else if (!isSupportedTargetLanguage(sync.language)) {
				throw new Error(
					"Only a supported target language Reading's definition is segmented.",
				);
			} else {
				const sentence = await segmentDefinition(
					sync.definition,
					sync.language,
				);
				await ctx.runMutation(
					internal.definitionTexts.persistSegmented,
					{
						ownerReadingKey,
						runNumber,
						definition: sync.definition,
						language: sync.language,
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
				outcome = { kind: "Ready" };
			}
		} catch (error) {
			console.error("Definition Text materialization failed", error);
			outcome = { kind: "Failed" };
		}
		await ctx.runMutation(internal.definitionTexts.settle, {
			ownerReadingKey,
			runNumber,
			outcome,
		});
		return null;
	},
});
