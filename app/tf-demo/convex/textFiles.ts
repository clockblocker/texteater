import { v } from "convex/values";
import { assertIdentifier, assertNonEmpty } from "../server/identifiers";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { insertSection, placeScroll } from "./model/codex";

/**
 * The writes behind a `.txt` Submission (#1191). The browser uploads the
 * file to Convex File Storage through `generateUploadUrl`, and
 * `textFileIntake.submitTextFile` reads it, then writes its Sections in one
 * mutation and its Scrolls, each with its unprocessed Sentences, in
 * batches. The stored file stays as the Original.
 */

/** Where the browser sends a `.txt` file before submitting it. */
export const generateUploadUrl = mutation({
	args: { visitorId: v.string() },
	returns: v.string(),
	handler: async (ctx, { visitorId }) => {
		assertIdentifier(visitorId, "visitorId");
		return ctx.storage.generateUploadUrl();
	},
});

/** Earlier submissions of one file that this looks through. */
const MAX_STORED_COPIES = 10;

/**
 * The top Section an earlier, complete submission of the same file wrote:
 * one holding all `scrollCount` of its Scrolls. A copy a failed run left
 * half written is not it.
 */
export const storedSubmission = internalQuery({
	args: { submissionKey: v.string(), scrollCount: v.number() },
	returns: v.union(
		v.null(),
		v.object({ sectionId: v.id("sections"), title: v.string() }),
	),
	handler: async (ctx, { submissionKey, scrollCount }) => {
		const copies = await ctx.db
			.query("sections")
			.withIndex("by_submission_key", (q) =>
				q.eq("submissionKey", submissionKey),
			)
			.take(MAX_STORED_COPIES);
		const complete = copies.find(
			(section) =>
				section.placement === undefined &&
				section.scrollCount === scrollCount,
		);
		return complete
			? { sectionId: complete._id, title: complete.title }
			: null;
	},
});

/**
 * Writes a file's Sections, parent before child: the first is the top
 * Section, which carries the Submission's key and the Original; each other
 * names its parent by index and its Codex order. Returns their IDs in order.
 */
export const writeSections = internalMutation({
	args: {
		submissionKey: v.string(),
		originalId: v.id("_storage"),
		sections: v.array(
			v.object({
				title: v.string(),
				parent: v.union(v.null(), v.number()),
				order: v.number(),
			}),
		),
	},
	returns: v.array(v.id("sections")),
	handler: async (ctx, { submissionKey, originalId, sections }) => {
		assertNonEmpty(submissionKey, "submissionKey");
		const ids: Id<"sections">[] = [];
		for (const [index, section] of sections.entries()) {
			assertNonEmpty(section.title, "section.title");
			if ((index === 0) !== (section.parent === null))
				throw new Error("Only the first Section is the top one.");
			const parentId =
				section.parent === null ? undefined : ids[section.parent];
			if (section.parent !== null && parentId === undefined)
				throw new Error("A Section's parent is written before it.");
			ids.push(
				await insertSection(
					ctx,
					parentId === undefined
						? { title: section.title, submissionKey, originalId }
						: {
								title: section.title,
								placement: {
									sectionId: parentId,
									order: section.order,
								},
							},
				),
			);
		}
		return ids;
	},
});

/**
 * Writes a batch of a file's Scrolls, each placed in its Section's Codex
 * with its Sentences stored unprocessed: no Detected Language and no
 * Segments, so the reader shows them as plain text until processing
 * reaches them (#1193). A Sentence's ID is its Scroll's key and position.
 */
export const writeScrolls = internalMutation({
	args: {
		scrolls: v.array(
			v.object({
				sectionId: v.id("sections"),
				order: v.number(),
				submissionKey: v.string(),
				title: v.optional(v.string()),
				sourceText: v.string(),
				/** Dumgen's `Scroll`, stored unchecked as `scrolls.extractedText` is. */
				extractedText: v.any(),
				sceneBreaks: v.array(v.number()),
				sentences: v.array(
					v.object({
						position: v.number(),
						paragraph: v.number(),
						stitchedText: v.string(),
					}),
				),
			}),
		),
	},
	returns: v.null(),
	handler: async (ctx, { scrolls }) => {
		for (const scroll of scrolls) {
			assertNonEmpty(scroll.submissionKey, "submissionKey");
			const scrollId = await ctx.db.insert("scrolls", {
				submissionKey: scroll.submissionKey,
				sourceText: scroll.sourceText,
				extractedText: scroll.extractedText,
				...(scroll.title ? { title: scroll.title } : {}),
				...(scroll.sceneBreaks.length > 0
					? { sceneBreaks: scroll.sceneBreaks }
					: {}),
			});
			await placeScroll(ctx, scrollId, {
				sectionId: scroll.sectionId,
				order: scroll.order,
			});
			for (const sentence of scroll.sentences) {
				assertNonEmpty(sentence.stitchedText, "stitchedText");
				await ctx.db.insert("sentences", {
					segmentedSentenceId: `${scroll.submissionKey}#${sentence.position}`,
					scrollId,
					position: sentence.position,
					paragraph: sentence.paragraph,
					stitchedText: sentence.stitchedText,
				});
			}
		}
		return null;
	},
});

/** Scrolls one discarding batch deletes, each with up to 2,000 Sentences. */
const DISCARD_SCROLLS_PER_BATCH = 4;

/**
 * Deletes a batch of a half-written submission's Scrolls placed in one
 * Section, with their Sentences, and the Section itself once it holds
 * none. Returns whether any is left. Intake calls it for each Section a
 * failed run wrote, deepest first, so no half-written book stays in the
 * Library.
 */
export const discardSectionBatch = internalMutation({
	args: { sectionId: v.id("sections") },
	returns: v.boolean(),
	handler: async (ctx, { sectionId }) => {
		const scrolls = await ctx.db
			.query("scrolls")
			.withIndex("by_placement", (q) =>
				q.eq("placement.sectionId", sectionId),
			)
			.take(DISCARD_SCROLLS_PER_BATCH);
		for (const scroll of scrolls) {
			const sentences = await ctx.db
				.query("sentences")
				.withIndex("by_scroll_id_and_position", (q) =>
					q.eq("scrollId", scroll._id),
				)
				.collect();
			for (const sentence of sentences) await ctx.db.delete(sentence._id);
			await ctx.db.delete(scroll._id);
		}
		if (scrolls.length === DISCARD_SCROLLS_PER_BATCH) return true;
		const section = await ctx.db.get(sectionId);
		if (section) {
			if (section.originalId)
				await ctx.storage.delete(section.originalId);
			await ctx.db.delete(sectionId);
		}
		return false;
	},
});
