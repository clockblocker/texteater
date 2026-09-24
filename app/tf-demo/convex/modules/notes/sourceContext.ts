/**
 * Source Context: one occurrence quoted in its source Sentence, with where
 * that Sentence lives and how to open it in place. Every server-side Note
 * that quotes an occurrence projects it here; which occurrences a Note
 * quotes stays with the Note.
 */
import { type Infer, v } from "convex/values";

import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { loadStoredSegments } from "../../model/storedSegments";
import { segmentKindValidator } from "../../model/validators";
import {
	grammaticalGenderValidator,
	projectSentenceView,
} from "../text/sentenceView";

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
	gender: v.optional(grammaticalGenderValidator),
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
async function projectSourceOrigin(
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
function sourceTargetFor(
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

/**
 * The quote every Source Context shares: the Sentence's Segments, with the
 * grammatical gender the Visitor has encountered when one is given, the
 * occurrence's members, its origin, and the target that opens it in place.
 * Null when the Sentence belongs to a Definition whose Reading is gone.
 */
export async function projectOccurrenceSource(
	ctx: QueryCtx,
	occurrence: {
		readonly attestationId: Id<"attestations">;
		readonly sentence: Doc<"sentences">;
		readonly text: Doc<"texts">;
		readonly memberSegmentIndices: readonly number[];
	},
	visitorId?: string,
) {
	const { attestationId, sentence, text } = occurrence;
	const [origin, segments] = await Promise.all([
		projectSourceOrigin(ctx, text),
		visitorId
			? projectSentenceView(ctx, sentence, visitorId).then(
					(view) => view.segments,
				)
			: loadStoredSegments(ctx, sentence._id),
	]);
	if (!origin) return null;
	return {
		textId: text._id,
		sentencePosition: sentence.position,
		sentenceSnippet: sentence.stitchedText,
		segments: segments.map(
			(segment): Infer<typeof sourceSegmentValidator> => ({
				kind: segment.kind,
				text: segment.text,
				...("gender" in segment && segment.gender
					? { gender: segment.gender }
					: {}),
			}),
		),
		memberSegmentIndices: [...occurrence.memberSegmentIndices],
		origin,
		target: sourceTargetFor(origin, text._id, attestationId),
	};
}
