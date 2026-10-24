import { type Infer, v } from "convex/values";
import type { ProcessedSentence } from "../../server/folioIntake";
import { cutFolios, savesOf, windowsOf } from "../../server/folios";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx } from "../_generated/server";
import { assertAnalyzedSentence } from "../modules/scroll/submission";
import { sentenceInputValidator } from "./validators";

/*
 * A book's Folios in storage: written with its Scrolls, unprocessed, and
 * processed one at a time when a Learner asks (#1216). A request starts a
 * run of `folioProcessing.run` and the watchdog that guards it.
 */

/** Longer than a Convex action may run, so a quiet run is a dead one. */
export const STALE_FOLIO_RUN_AFTER_MS = 11 * 60 * 1_000;

/** Writes a book Scroll's Folios, all of them unprocessed. */
export async function writeFolios(
	ctx: MutationCtx,
	scrollId: Id<"scrolls">,
	sentences: readonly {
		readonly position: number;
		readonly paragraph: number;
		readonly stitchedText: string;
	}[],
): Promise<void> {
	for (const folio of cutFolios(sentences))
		await ctx.db.insert("folios", { scrollId, ...folio });
}

/** Deletes a Scroll's Folios. */
export async function discardFolios(
	ctx: MutationCtx,
	scrollId: Id<"scrolls">,
): Promise<void> {
	const folios = await ctx.db
		.query("folios")
		.withIndex("by_scroll_id_and_start", (q) => q.eq("scrollId", scrollId))
		.collect();
	for (const folio of folios) await ctx.db.delete(folio._id);
}

/**
 * A Learner asked for a Folio: unless it is processing or processed, a
 * new run starts on it, with its watchdog.
 */
export async function requestFolio(
	ctx: MutationCtx,
	folio: Doc<"folios">,
): Promise<void> {
	if (folio.state === "Processing" || folio.state === "Processed") return;
	const run = (folio.run ?? 0) + 1;
	await ctx.db.patch(folio._id, {
		state: "Processing",
		run,
		updatedAt: Date.now(),
	});
	const args = { folioId: folio._id, run };
	await ctx.scheduler.runAfter(0, internal.folioProcessing.run, args);
	await ctx.scheduler.runAfter(
		STALE_FOLIO_RUN_AFTER_MS,
		internal.folios.recoverStaleRun,
		args,
	);
}

/** The Folio, while this run still holds it. */
async function heldFolio(
	ctx: MutationCtx,
	folioId: Id<"folios">,
	run: number,
): Promise<Doc<"folios"> | null> {
	const folio = await ctx.db.get(folioId);
	return folio?.state === "Processing" && folio.run === run ? folio : null;
}

/**
 * The next window of the Folio's unprocessed Sentences. Null once none is
 * left, which marks the Folio processed in the same transaction, or once
 * this run no longer holds it.
 */
export async function nextFolioWindow(
	ctx: MutationCtx,
	folioId: Id<"folios">,
	run: number,
) {
	const folio = await heldFolio(ctx, folioId, run);
	if (!folio) return null;
	const sentences = await ctx.db
		.query("sentences")
		.withIndex("by_scroll_id_and_position", (q) =>
			q
				.eq("scrollId", folio.scrollId)
				.gte("position", folio.start)
				.lt("position", folio.end),
		)
		.collect();
	const [window] = windowsOf(
		sentences.filter(({ units }) => units === undefined),
	);
	if (!window) {
		await ctx.db.patch(folio._id, {
			state: "Processed",
			updatedAt: Date.now(),
		});
		return null;
	}
	await ctx.db.patch(folio._id, { updatedAt: Date.now() });
	return {
		sentences: window.map((sentence) => ({
			sentenceId: sentence._id,
			paragraph: sentence.paragraph,
			stitchedText: sentence.stitchedText,
		})),
	};
}

/**
 * One Sentence's share of a save (`savesOf`): its Segments from index
 * `from`, and on its last share the rest of what intake found.
 */
export const savedShareValidator = v.object({
	sentenceId: v.id("sentences"),
	from: v.number(),
	segments: sentenceInputValidator.fields.segments,
	analysis: v.optional(
		sentenceInputValidator.omit(
			"segmentedSentenceId",
			"position",
			"paragraph",
			"segments",
		),
	),
});

/**
 * Stores one save of a processed window in place, so the Sentences keep
 * their IDs: each share's Segments, replacing any a failed run left at
 * those indices, and, on a Sentence's last share, the rest of its analysis,
 * which marks it processed. A run that no longer holds the Folio stores
 * nothing.
 */
export async function storeFolioSave(
	ctx: MutationCtx,
	folioId: Id<"folios">,
	run: number,
	shares: readonly Infer<typeof savedShareValidator>[],
): Promise<void> {
	const folio = await heldFolio(ctx, folioId, run);
	if (!folio) return;
	for (const { sentenceId, from, segments, analysis } of shares) {
		const sentence = await ctx.db.get(sentenceId);
		if (
			!sentence ||
			sentence.scrollId !== folio.scrollId ||
			sentence.position < folio.start ||
			sentence.position >= folio.end
		)
			throw new Error("A save's Sentences are its Folio's.");
		if (sentence.units !== undefined) continue;
		const end = analysis
			? Number.POSITIVE_INFINITY
			: from + segments.length;
		const left = await ctx.db
			.query("segments")
			.withIndex("by_sentence_id_and_index", (q) =>
				q
					.eq("sentenceId", sentenceId)
					.gte("index", from)
					.lt("index", end),
			)
			.collect();
		for (const segment of left) await ctx.db.delete(segment._id);
		for (const [offset, segment] of segments.entries())
			await ctx.db.insert("segments", {
				sentenceId,
				index: from + offset,
				...segment,
			});
		if (analysis)
			await ctx.db.patch(sentenceId, {
				language: analysis.language,
				stitchedText: analysis.stitchedText,
				units: analysis.units,
				segmentationFailed: analysis.segmentationFailed,
			});
	}
}

/** The run failed: the Folio says so, and may be asked for again. */
export async function failFolioRun(
	ctx: MutationCtx,
	folioId: Id<"folios">,
	run: number,
): Promise<void> {
	const folio = await heldFolio(ctx, folioId, run);
	if (folio)
		await ctx.db.patch(folio._id, {
			state: "Failed",
			updatedAt: Date.now(),
		});
}

/**
 * The watchdog every request schedules. A run quiet for longer than an
 * action may live lost its action, so the Folio fails; one still checking
 * in is looked at again later.
 */
export async function recoverStaleFolioRun(
	ctx: MutationCtx,
	folioId: Id<"folios">,
	run: number,
): Promise<void> {
	const folio = await heldFolio(ctx, folioId, run);
	if (!folio) return;
	const age = Date.now() - (folio.updatedAt ?? 0);
	if (age < STALE_FOLIO_RUN_AFTER_MS) {
		await ctx.scheduler.runAfter(
			STALE_FOLIO_RUN_AFTER_MS - age,
			internal.folios.recoverStaleRun,
			{ folioId, run },
		);
		return;
	}
	await failFolioRun(ctx, folioId, run);
}

/**
 * The storage one run of `folioProcessing.run` processes a Folio through:
 * the `folios` mutations, from an action. A processed window is checked
 * Sentence by Sentence, then stored in saves of at most `SAVE_SEGMENTS`
 * Segments, each its own mutation (#1214).
 */
export function folioProcessingPort(
	ctx: Pick<ActionCtx, "runMutation">,
	folioId: Id<"folios">,
	run: number,
) {
	return {
		nextWindow: () =>
			ctx.runMutation(internal.folios.nextWindow, { folioId, run }),
		storeWindow: async (
			processed: readonly ProcessedSentence<Id<"sentences">>[],
		) => {
			const sentences = processed.map((sentence) => ({
				...sentence,
				segments: [...sentence.segments],
				units: [...sentence.units],
			}));
			for (const sentence of sentences) assertAnalyzedSentence(sentence);
			for (const save of savesOf(sentences))
				await ctx.runMutation(internal.folios.storeSave, {
					folioId,
					run,
					shares: save.map((share) => ({
						...share,
						segments: [...share.segments],
					})),
				});
		},
		failed: () =>
			ctx.runMutation(internal.folios.failRun, { folioId, run }),
	};
}
