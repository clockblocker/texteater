import { v } from "convex/values";
import { coreGender } from "../../../shared/grammatical-gender";

import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import {
	languageValidator,
	segmentKindValidator,
} from "../../model/validators";
import { findVisitorEncounter } from "../../model/visitorClicks";

export const grammaticalGenderValidator = v.union(
	v.literal("Fem"),
	v.literal("Masc"),
	v.literal("Neut"),
);

const MAX_SEGMENTS_PER_SENTENCE = 512;

export const presentedSegmentResolutionStateValidator = v.union(
	v.literal("Active"),
	v.literal("Unresolved"),
	v.literal("PermanentFailure"),
);

export const sentenceSegmentViewValidator = v.object({
	index: v.number(),
	kind: segmentKindValidator,
	text: v.string(),
	attestationId: v.optional(v.id("attestations")),
	encountered: v.boolean(),
	gender: v.optional(grammaticalGenderValidator),
	resolutionState: v.optional(presentedSegmentResolutionStateValidator),
});

export const sentenceViewValidator = v.object({
	sentenceId: v.id("sentences"),
	position: v.number(),
	paragraph: v.optional(v.number()),
	language: languageValidator,
	stitchedText: v.string(),
	heading: v.optional(v.string()),
	segments: v.array(sentenceSegmentViewValidator),
});

export function loadSentenceSegments(
	ctx: QueryCtx,
	sentenceId: Id<"sentences">,
): Promise<Doc<"segments">[]> {
	return ctx.db
		.query("segments")
		.withIndex("by_sentence_id_and_index", (q) =>
			q.eq("sentenceId", sentenceId),
		)
		.take(MAX_SEGMENTS_PER_SENTENCE);
}

/**
 * One Sentence as a Visitor sees it in the reader: every Segment, the
 * occurrence it belongs to, and the resolution state this Visitor has
 * earned by encountering it. An occurrence counts as encountered when any
 * of its members was.
 */
export async function projectSentenceView(
	ctx: QueryCtx,
	sentence: Doc<"sentences">,
	visitorId: string,
) {
	const segments = await loadSentenceSegments(ctx, sentence._id);
	const encounters = await Promise.all(
		segments.map((segment) =>
			findVisitorEncounter(ctx, { visitorId, segmentId: segment._id }),
		),
	);
	const encounteredAttestationIds = new Set<Id<"attestations">>();
	for (const [index, segment] of segments.entries()) {
		const attestationId = segment.attestationMembership?.attestationId;
		if (encounters[index] && attestationId) {
			encounteredAttestationIds.add(attestationId);
		}
	}
	const genders = new Map(
		await Promise.all(
			[...encounteredAttestationIds].map(async (id) => {
				const attestation = await ctx.db.get(id);
				const reading = attestation
					? await ctx.db.get(attestation.readingId)
					: null;
				const lemma = reading
					? await ctx.db.get(reading.lemmaId)
					: null;
				return [id, lemma ? coreGender(lemma) : undefined] as const;
			}),
		),
	);
	return {
		sentenceId: sentence._id,
		position: sentence.position,
		...(sentence.paragraph === undefined
			? {}
			: { paragraph: sentence.paragraph }),
		language: sentence.language,
		stitchedText: sentence.stitchedText,
		...(sentence.heading ? { heading: sentence.heading } : {}),
		segments: segments.map((segment, position) => {
			const attestationId = segment.attestationMembership?.attestationId;
			const encountered = Boolean(
				encounters[position] ||
					(attestationId &&
						encounteredAttestationIds.has(attestationId)),
			);
			return {
				index: segment.index,
				kind: segment.kind,
				text: segment.text,
				...(attestationId ? { attestationId } : {}),
				encountered,
				...(attestationId && genders.get(attestationId)
					? { gender: genders.get(attestationId) }
					: {}),
				...(encountered && segment.resolutionState
					? { resolutionState: segment.resolutionState.kind }
					: {}),
			};
		}),
	};
}
