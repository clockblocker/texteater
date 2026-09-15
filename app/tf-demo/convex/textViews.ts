import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";
import { loadCompleteOccurrenceMembers } from "./model/occurrenceAttestations";
import {
	projectSentenceView,
	sentenceViewValidator,
} from "./modules/text/sentenceView";

const MAX_SENTENCES_PER_TEXT = 256;

const textFocusValidator = v.union(
	v.object({ kind: v.literal("None") }),
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

const textViewValidator = v.object({
	kind: v.literal("Text"),
	target: v.object({
		kind: v.literal("Text"),
		textId: v.id("texts"),
		focusAttestationId: v.optional(v.string()),
	}),
	textId: v.id("texts"),
	sourceText: v.string(),
	createdAt: v.number(),
	focus: textFocusValidator,
	sentences: v.array(sentenceViewValidator),
});

export const get = query({
	args: {
		textId: v.string(),
		visitorId: v.string(),
		focusAttestationId: v.optional(v.string()),
	},
	returns: v.union(v.null(), textViewValidator),
	handler: async (
		ctx,
		{ textId: textIdValue, visitorId, focusAttestationId },
	) => {
		const textId = ctx.db.normalizeId("texts", textIdValue);
		if (!textId) return null;
		const text = await ctx.db.get(textId);
		if (!text) return null;
		const [focus, sentences] = await Promise.all([
			loadTextFocus(ctx, textId, focusAttestationId),
			ctx.db
				.query("sentences")
				.withIndex("by_text_id_and_position", (q) =>
					q.eq("textId", textId),
				)
				.take(MAX_SENTENCES_PER_TEXT),
		]);
		const sentenceViews = await Promise.all(
			sentences.map((sentence) =>
				projectSentenceView(ctx, sentence, visitorId),
			),
		);

		return {
			kind: "Text" as const,
			target: {
				kind: "Text" as const,
				textId: text._id,
				...(focusAttestationId ? { focusAttestationId } : {}),
			},
			textId: text._id,
			sourceText: text.sourceText,
			createdAt: text._creationTime,
			focus,
			sentences: sentenceViews,
		};
	},
});

export async function loadTextFocus(
	ctx: QueryCtx,
	textId: Id<"texts">,
	requestedAttestationId?: string,
) {
	if (!requestedAttestationId) return { kind: "None" as const };
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
	if (!sentence || sentence.textId !== textId) {
		return { kind: "Missing" as const, requestedAttestationId };
	}
	return {
		kind: "Occurrence" as const,
		attestationId,
		sentenceId: sentence._id,
		memberSegmentIndices: members.memberSegmentIndices,
	};
}
