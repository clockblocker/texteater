"use node";

import { v } from "convex/values";
import * as Effect from "effect/Effect";

import { createProductionDumgen } from "../server/modelExecution";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { stripTextAnalysisGraph } from "./model/textAnalysisStripping";

const dumgen = createProductionDumgen();

/**
 * Brings one Reading's Definition Text in line with its Knowledge: strips and
 * removes the previous Definition Text when the definition changed or was
 * retracted, then segments and persists the requested one. Trusted
 * segmentation runs without intake, so the generator's target language is
 * taken as given. A definition that changed while this ran is picked up by
 * a rescheduled run.
 */
export const materialize = internalAction({
	args: { ownerReadingKey: v.string() },
	returns: v.null(),
	handler: async (ctx, { ownerReadingKey }) => {
		const sync = await ctx.runQuery(internal.definitionTexts.loadSync, {
			ownerReadingKey,
		});
		if (!sync) return null;
		await ctx.runMutation(internal.definitionTexts.markRunning, {
			ownerReadingKey,
		});
		let outcome:
			| { kind: "Ready" }
			| { kind: "Retracted" }
			| { kind: "Failed"; message: string };
		try {
			const replace =
				sync.textId !== undefined &&
				sync.materializedDefinition !== sync.definition;
			if (sync.textId && replace) {
				await stripTextAnalysisGraph(ctx, sync.textId, {
					protectedReadingKeys: [ownerReadingKey],
				});
				await ctx.runMutation(internal.definitionTexts.deleteTextRows, {
					ownerReadingKey,
					textId: sync.textId,
				});
			}
			if (sync.definition === undefined) {
				outcome = { kind: "Retracted" };
			} else if (sync.textId && !replace) {
				outcome = { kind: "Ready" };
			} else if (sync.language === null) {
				throw new Error(
					"The defined Reading has no segmentable language.",
				);
			} else {
				const sentence = await Effect.runPromise(
					dumgen.segmentSentence({
						language: sync.language,
						stitchedText: sync.definition,
					}),
				);
				const persisted = await ctx.runMutation(
					internal.definitionTexts.persistSegmented,
					{
						ownerReadingKey,
						definition: sync.definition,
						language: sentence.language,
						segmentedSentenceId: sentence.id,
						segments: sentence.segments.map(({ kind, text }) => ({
							kind,
							text,
						})),
					},
				);
				outcome = { kind: "Ready" };
				if (persisted === "Stale") outcome = { kind: "Ready" };
			}
		} catch (error) {
			console.error("Definition Text materialization failed", error);
			outcome = {
				kind: "Failed",
				message:
					error instanceof Error
						? error.message
						: "Definition segmentation failed.",
			};
		}
		const settled = await ctx.runMutation(internal.definitionTexts.settle, {
			ownerReadingKey,
			outcome,
		});
		if (settled === "Reschedule") {
			await ctx.scheduler.runAfter(
				0,
				internal.definitionTextActions.materialize,
				{ ownerReadingKey },
			);
		}
		return null;
	},
});
