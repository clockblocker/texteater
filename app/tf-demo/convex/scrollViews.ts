import { v } from "convex/values";
import { PAGE_SENTENCES, readerPages } from "../server/folios";
import { MAX_SENTENCES_PER_SCROLL } from "../server/textSubmissionLimits";
import type { Id } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";
import { loadCompleteOccurrenceMembers } from "./model/occurrenceAttestations";
import {
	projectSentenceView,
	sentenceViewValidator,
} from "./modules/scroll/sentenceView";

/** Where one occurrence sits in a Scroll, so the reader can land on it. */
const occurrenceFocusValidator = v.union(
	v.object({
		kind: v.literal("Missing"),
		requestedAttestationId: v.string(),
	}),
	v.object({
		kind: v.literal("Occurrence"),
		attestationId: v.id("attestations"),
		sentenceId: v.id("sentences"),
		/** The Sentence's position, so a book's reader loads its page first. */
		position: v.number(),
		memberSegmentIndices: v.array(v.number()),
	}),
);

const sentenceRangeValidator = v.object({
	start: v.number(),
	end: v.number(),
});

const scrollViewValidator = v.object({
	kind: v.literal("Scroll"),
	target: v.object({
		kind: v.literal("Scroll"),
		scrollId: v.id("scrolls"),
	}),
	scrollId: v.id("scrolls"),
	submissionKey: v.string(),
	/** The page a Scroll from a link came from, for the way back to it. */
	originalUrl: v.optional(v.string()),
	sourceText: v.string(),
	createdAt: v.number(),
	/** Every Sentence, for a Scroll with no `pages`; else none. */
	sentences: v.array(sentenceViewValidator),
	/**
	 * A book Scroll's pages in order (#1212): the reader loads their
	 * Sentences a page at a time with `page`.
	 */
	pages: v.optional(v.array(sentenceRangeValidator)),
	/** The paragraphs a Scene Break stands before. */
	sceneBreaks: v.array(v.number()),
});

/** A Scroll this Visitor may read: shared, or their own private one. */
async function readableScroll(
	ctx: QueryCtx,
	scrollIdValue: string,
	visitorId: string,
) {
	const scrollId = ctx.db.normalizeId("scrolls", scrollIdValue);
	const scroll = scrollId ? await ctx.db.get(scrollId) : null;
	// A private Scroll, one from a link, opens only for its own Visitor.
	if (!scroll || (scroll.owner !== undefined && scroll.owner !== visitorId))
		return null;
	return scroll;
}

export const get = query({
	args: {
		scrollId: v.string(),
		visitorId: v.string(),
	},
	returns: v.union(v.null(), scrollViewValidator),
	handler: async (ctx, { scrollId, visitorId }) => {
		const scroll = await readableScroll(ctx, scrollId, visitorId);
		if (!scroll) return null;
		// A book Scroll's reader loads it by page.
		const folios = await ctx.db
			.query("folios")
			.withIndex("by_scroll_id_and_start", (q) =>
				q.eq("scrollId", scroll._id),
			)
			.take(MAX_SENTENCES_PER_SCROLL);
		const sentences =
			folios.length > 0
				? []
				: await ctx.db
						.query("sentences")
						.withIndex("by_scroll_id_and_position", (q) =>
							q.eq("scrollId", scroll._id),
						)
						.take(MAX_SENTENCES_PER_SCROLL);
		const sentenceViews = await Promise.all(
			sentences.map((sentence) =>
				projectSentenceView(ctx, sentence, visitorId),
			),
		);

		return {
			kind: "Scroll" as const,
			target: {
				kind: "Scroll" as const,
				scrollId: scroll._id,
			},
			scrollId: scroll._id,
			submissionKey: scroll.submissionKey,
			...(scroll.link ? { originalUrl: scroll.link.url } : {}),
			sourceText: scroll.sourceText,
			createdAt: scroll._creationTime,
			sentences: sentenceViews,
			...(folios.length > 0 ? { pages: readerPages(folios) } : {}),
			sceneBreaks: scroll.sceneBreaks ?? [],
		};
	},
});

/**
 * One page of a book Scroll, as `get` lists them: its Sentences as the
 * Visitor sees them. Null when the Scroll cannot be read.
 */
export const page = query({
	args: {
		scrollId: v.string(),
		visitorId: v.string(),
		start: v.number(),
		end: v.number(),
	},
	returns: v.union(v.null(), v.array(sentenceViewValidator)),
	handler: async (ctx, { scrollId, visitorId, start, end }) => {
		if (
			!Number.isSafeInteger(start) ||
			!Number.isSafeInteger(end) ||
			start < 0 ||
			end <= start ||
			end - start > PAGE_SENTENCES
		)
			throw new Error(
				`A page is a run of 1 to ${PAGE_SENTENCES} Sentence positions.`,
			);
		const scroll = await readableScroll(ctx, scrollId, visitorId);
		if (!scroll) return null;
		const sentences = await ctx.db
			.query("sentences")
			.withIndex("by_scroll_id_and_position", (q) =>
				q
					.eq("scrollId", scroll._id)
					.gte("position", start)
					.lt("position", end),
			)
			.take(PAGE_SENTENCES);
		return Promise.all(
			sentences.map((sentence) =>
				projectSentenceView(ctx, sentence, visitorId),
			),
		);
	},
});

/**
 * Locates one occurrence inside a Scroll for a Source Context arrival. It is
 * separate from `get` so landing on an occurrence never changes the Scroll
 * query's identity.
 */
export const occurrenceFocus = query({
	args: { scrollId: v.string(), attestationId: v.string() },
	returns: occurrenceFocusValidator,
	handler: async (ctx, { scrollId: scrollIdValue, attestationId }) => {
		const scrollId = ctx.db.normalizeId("scrolls", scrollIdValue);
		if (!scrollId) {
			return {
				kind: "Missing" as const,
				requestedAttestationId: attestationId,
			};
		}
		return loadScrollFocus(ctx, scrollId, attestationId);
	},
});

export async function loadScrollFocus(
	ctx: QueryCtx,
	scrollId: Id<"scrolls">,
	requestedAttestationId: string,
) {
	const attestationId = ctx.db.normalizeId(
		"attestations",
		requestedAttestationId,
	);
	if (!attestationId) {
		return { kind: "Missing" as const, requestedAttestationId };
	}
	const attestation = await ctx.db.get(attestationId);
	if (!attestation) {
		return { kind: "Missing" as const, requestedAttestationId };
	}
	const members = await loadCompleteOccurrenceMembers(ctx, attestationId);
	if (!members) {
		return { kind: "Missing" as const, requestedAttestationId };
	}
	const sentence = await ctx.db.get(members.sentenceId);
	if (!sentence || sentence.scrollId !== scrollId) {
		return { kind: "Missing" as const, requestedAttestationId };
	}
	return {
		kind: "Occurrence" as const,
		attestationId,
		sentenceId: sentence._id,
		position: sentence.position,
		memberSegmentIndices: members.memberSegmentIndices,
	};
}
