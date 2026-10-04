/**
 * Source Context: one occurrence quoted in its source Sentence, with where
 * that Sentence lives and how to open it in place. Every server-side Note
 * that quotes an occurrence projects it here; which occurrences a Note
 * quotes stays with the Note.
 */
import { type Infer, v } from "convex/values";

import type { SourceTextTarget } from "../../../shared/navigation";
import { textTitle } from "../../../shared/text-title";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { loadStoredSegments } from "../../model/storedSegments";
import { segmentKindValidator } from "../../model/validators";
import {
	grammaticalGenderValidator,
	projectSentenceView,
} from "../text/sentenceView";
import { unitReadingEmojiDescription } from "./unitReadingFamilies";

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

/**
 * The Text that shows the occurrence in place: a Visitor-submitted Text or a
 * Definition Text alike (tf-demo ADR 0005).
 */
export const sourceTargetValidator = v.object({
	kind: v.literal("Text"),
	textId: v.id("texts"),
	focusAttestationId: v.id("attestations"),
	title: v.string(),
});

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

export type SourceTarget = SourceTextTarget & {
	readonly textId: Id<"texts">;
	readonly focusAttestationId: Id<"attestations">;
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
		emojiDescription: unitReadingEmojiDescription(reading),
		canonicalForm: lemma.canonicalForm,
	};
}

/**
 * The workspace destination that shows this occurrence in place: its Text,
 * pushed as a Cover scrolled to the Sentence and titled as the Library
 * titles it, whether a Visitor submitted it or it holds a definition.
 */
function sourceTargetFor(
	text: Doc<"texts">,
	attestationId: Id<"attestations">,
): SourceTarget {
	return {
		kind: "Text",
		textId: text._id,
		focusAttestationId: attestationId,
		title: textTitle(text),
	};
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
		target: sourceTargetFor(text, attestationId),
	};
}
