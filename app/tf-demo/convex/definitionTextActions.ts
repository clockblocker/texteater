"use node";

import { v } from "convex/values";
import { createSegment, createTypeSafeAsk } from "dumgen";

import { internal } from "./_generated/api";
import { env, internalAction } from "./_generated/server";
import { stripTextAnalysisGraph } from "./model/textAnalysisStripping";

/**
 * Cuts a German definition into one Sentence's Segments and biggest units
 * with Dumgen's `segment.inUnits`, the definition taken whole as that
 * Sentence: no `splitText`, since a Definition Text holds one Sentence.
 */
async function segmentDefinition(definition: string) {
	const apiKey = env.TYPESAFE_API_KEY;
	if (!apiKey)
		throw new Error(
			"TYPESAFE_API_KEY is not set, so the definition cannot be segmented.",
		);
	const segmented = await createSegment({
		ask: createTypeSafeAsk({ apiKey }),
	}).inUnits({ language: "de", paragraphs: [{ sentences: [definition] }] });
	const sentence = segmented.paragraphs[0]?.sentences[0];
	if (!sentence) throw new Error("The definition yielded no Sentence.");
	return sentence;
}

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
			} else if (sync.language !== "de") {
				throw new Error(
					"Only a German Reading's definition is segmented.",
				);
			} else {
				const sentence = await segmentDefinition(sync.definition);
				await ctx.runMutation(
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
						units: sentence.units.map((unit) => ({
							segments: [...unit.segments],
							route:
								unit.route === "Unresolved"
									? ("Unresolved" as const)
									: { ...unit.route },
							...(unit.variants
								? {
										variants: unit.variants.map(
											(route) => ({ ...route }),
										),
									}
								: {}),
						})),
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
