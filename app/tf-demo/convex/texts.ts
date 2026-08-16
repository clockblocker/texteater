import { v } from "convex/values";

import { query } from "./_generated/server";
import { segmentKindValidator } from "./model/validators";

const MAX_LIBRARY_TEXTS = 100;
const MAX_SENTENCES_PER_TEXT = 9;
const MAX_SEGMENTS_PER_SENTENCE = 512;

const libraryTextValidator = v.object({
	textId: v.id("texts"),
	sourceText: v.string(),
	createdAt: v.number(),
});

const textDetailValidator = v.object({
	textId: v.id("texts"),
	sourceText: v.string(),
	createdAt: v.number(),
	sentences: v.array(
		v.object({
			sentenceId: v.id("sentences"),
			position: v.number(),
			language: v.union(v.literal("de"), v.literal("he")),
			stitchedText: v.string(),
			segments: v.array(
				v.object({
					index: v.number(),
					kind: segmentKindValidator,
					text: v.string(),
				}),
			),
		}),
	),
});

export const list = query({
	args: {},
	returns: v.array(libraryTextValidator),
	handler: async (ctx) => {
		const texts = await ctx.db
			.query("texts")
			.order("desc")
			.take(MAX_LIBRARY_TEXTS);

		return texts.map((text) => ({
			textId: text._id,
			sourceText: text.sourceText,
			createdAt: text._creationTime,
		}));
	},
});

export const get = query({
	args: { textId: v.string() },
	returns: v.union(v.null(), textDetailValidator),
	handler: async (ctx, { textId }) => {
		const normalizedTextId = ctx.db.normalizeId("texts", textId);
		if (!normalizedTextId) return null;

		const text = await ctx.db.get(normalizedTextId);
		if (!text) return null;

		const sentences = await ctx.db
			.query("sentences")
			.withIndex("by_text_id_and_position", (q) =>
				q.eq("textId", normalizedTextId),
			)
			.take(MAX_SENTENCES_PER_TEXT);
		const segmentsBySentence = await Promise.all(
			sentences.map((sentence) =>
				ctx.db
					.query("segments")
					.withIndex("by_sentence_id_and_index", (q) =>
						q.eq("sentenceId", sentence._id),
					)
					.take(MAX_SEGMENTS_PER_SENTENCE),
			),
		);

		return {
			textId: text._id,
			sourceText: text.sourceText,
			createdAt: text._creationTime,
			sentences: sentences.map((sentence, index) => ({
				sentenceId: sentence._id,
				position: sentence.position,
				language: sentence.language,
				stitchedText: sentence.stitchedText,
				segments: (segmentsBySentence[index] ?? []).map((segment) => ({
					index: segment.index,
					kind: segment.kind,
					text: segment.text,
				})),
			})),
		};
	},
});
