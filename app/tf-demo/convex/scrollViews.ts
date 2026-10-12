import { v } from "convex/values";
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
		memberSegmentIndices: v.array(v.number()),
	}),
);

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
	sentences: v.array(sentenceViewValidator),
	/** The paragraphs a Scene Break stands before. */
	sceneBreaks: v.array(v.number()),
});

export const get = query({
	args: {
		scrollId: v.string(),
		visitorId: v.string(),
	},
	returns: v.union(v.null(), scrollViewValidator),
	handler: async (ctx, { scrollId: scrollIdValue, visitorId }) => {
		const scrollId = ctx.db.normalizeId("scrolls", scrollIdValue);
		if (!scrollId) return null;
		const scroll = await ctx.db.get(scrollId);
		// A private Scroll, one from a link, opens only for its own Visitor.
		if (
			!scroll ||
			(scroll.owner !== undefined && scroll.owner !== visitorId)
		)
			return null;
		const sentences = await ctx.db
			.query("sentences")
			.withIndex("by_scroll_id_and_position", (q) =>
				q.eq("scrollId", scrollId),
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
			sceneBreaks: scroll.sceneBreaks ?? [],
		};
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
		memberSegmentIndices: members.memberSegmentIndices,
	};
}
