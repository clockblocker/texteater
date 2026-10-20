import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
	followReader,
	nextFolioWindow,
	recordWindowFailure,
	recordWindowStored,
} from "./model/folios";
import { sentenceInputValidator } from "./model/validators";
import { assertAnalyzedSentence } from "./modules/scroll/submission";

/*
 * The storage side of a book's processing (#1193); `folioProcessing.run`
 * drives it.
 */

/** Processing starts at a Sentence position of a Scroll: its first Folio, for a new book. */
export const follow = internalMutation({
	args: { scrollId: v.id("scrolls"), position: v.number() },
	returns: v.null(),
	handler: async (ctx, { scrollId, position }) => {
		await followReader(ctx, scrollId, position);
		return null;
	},
});

export const nextWindow = internalMutation({
	args: { scrollId: v.id("scrolls") },
	returns: v.union(
		v.null(),
		v.object({
			folioId: v.id("folios"),
			window: v.number(),
			sentences: v.array(
				v.object({
					sentenceId: v.id("sentences"),
					paragraph: v.optional(v.number()),
					stitchedText: v.string(),
				}),
			),
		}),
	),
	handler: (ctx, { scrollId }) => nextFolioWindow(ctx, scrollId),
});

/** A window's Sentence as intake analyzed it, by its stored ID. */
const processedSentenceValidator = sentenceInputValidator
	.omit("segmentedSentenceId", "position", "paragraph")
	.extend({ sentenceId: v.id("sentences") });

/**
 * Fills in one processed window's Sentences: their Detected Language,
 * Segments and units, in place, so their IDs stay. A window stored already,
 * by a run that overlapped this one, is left as it is.
 */
export const storeWindow = internalMutation({
	args: {
		folioId: v.id("folios"),
		window: v.number(),
		sentences: v.array(processedSentenceValidator),
	},
	returns: v.null(),
	handler: async (ctx, { folioId, window, sentences }) => {
		const folio = await ctx.db.get(folioId);
		// A discarded book takes its Folios with it.
		if (!folio || folio.processedWindows > window) return null;
		if (folio.processedWindows < window)
			throw new Error("A Folio's windows are stored in order.");
		for (const { sentenceId, segments, ...analyzed } of sentences) {
			assertAnalyzedSentence({ ...analyzed, segments });
			const sentence = await ctx.db.get(sentenceId);
			if (
				!sentence ||
				sentence.scrollId !== folio.scrollId ||
				sentence.position < folio.start ||
				sentence.position >= folio.end
			)
				throw new Error("A window's Sentences are its Folio's.");
			if (sentence.units !== undefined)
				throw new Error("A Sentence is processed once.");
			await ctx.db.patch(sentenceId, {
				language: analyzed.language,
				stitchedText: analyzed.stitchedText,
				units: analyzed.units,
				segmentationFailed: analyzed.segmentationFailed,
			});
			for (const [index, segment] of segments.entries())
				await ctx.db.insert("segments", {
					sentenceId,
					index,
					...segment,
				});
		}
		await ctx.db.patch(folioId, { processedWindows: window + 1 });
		await recordWindowStored(ctx, folio.scrollId);
		return null;
	},
});

/**
 * A window failed; see `recordWindowFailure`. Without `retry`, the run
 * stops at once, as when the deployment cannot ask jev at all.
 */
export const windowFailed = internalMutation({
	args: { scrollId: v.id("scrolls"), retry: v.boolean() },
	returns: v.union(v.null(), v.number()),
	handler: (ctx, { scrollId, retry }) =>
		recordWindowFailure(ctx, scrollId, retry),
});
