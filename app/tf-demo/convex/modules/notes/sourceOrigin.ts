import { v } from "convex/values";

import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { segmentKindValidator } from "../../model/validators";

/** Where a source Sentence lives: a Visitor-submitted Text or one Reading's Definition. */
export const sourceOriginValidator = v.union(
	v.object({ kind: v.literal("Text") }),
	v.object({
		kind: v.literal("Definition"),
		readingId: v.id("readings"),
		emojiDescription: v.string(),
		canonicalForm: v.string(),
	}),
);

export const sourceTargetValidator = v.union(
	v.object({
		kind: v.literal("Text"),
		textId: v.id("texts"),
		focusAttestationId: v.id("attestations"),
	}),
	v.object({
		kind: v.literal("Reading"),
		readingId: v.id("readings"),
		focus: v.object({
			kind: v.literal("Definition"),
			attestationId: v.id("attestations"),
		}),
	}),
);

export const sourceSegmentValidator = v.object({
	kind: segmentKindValidator,
	text: v.string(),
});

export type SourceOrigin =
	| { readonly kind: "Text" }
	| {
			readonly kind: "Definition";
			readonly readingId: Id<"readings">;
			readonly emojiDescription: string;
			readonly canonicalForm: string;
	  };

export type SourceTarget =
	| {
			readonly kind: "Text";
			readonly textId: Id<"texts">;
			readonly focusAttestationId: Id<"attestations">;
	  }
	| {
			readonly kind: "Reading";
			readonly readingId: Id<"readings">;
			readonly focus: {
				readonly kind: "Definition";
				readonly attestationId: Id<"attestations">;
			};
	  };

/**
 * Names the Reading a Definition Text defines. Returns null when the Text is
 * a Definition Text whose Reading no longer exists, so the caller drops it.
 */
export async function projectSourceOrigin(
	ctx: QueryCtx,
	text: Doc<"texts">,
): Promise<SourceOrigin | null> {
	if (!text.origin) return { kind: "Text" };
	const reading = await ctx.db
		.query("readings")
		.withIndex("by_reading_key", (q) =>
			q.eq("readingKey", text.origin?.readingKey ?? ""),
		)
		.unique();
	if (!reading) return null;
	const lemma = await ctx.db.get(reading.lemmaId);
	if (!lemma) return null;
	return {
		kind: "Definition",
		readingId: reading._id,
		emojiDescription: reading.emojiDescription,
		canonicalForm: lemma.canonicalForm,
	};
}

/** The workspace destination that shows this occurrence in place. */
export function sourceTargetFor(
	origin: SourceOrigin,
	textId: Id<"texts">,
	attestationId: Id<"attestations">,
): SourceTarget {
	return origin.kind === "Definition"
		? {
				kind: "Reading",
				readingId: origin.readingId,
				focus: { kind: "Definition", attestationId },
			}
		: { kind: "Text", textId, focusAttestationId: attestationId };
}
