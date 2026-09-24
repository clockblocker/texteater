import { MAX_SEGMENTS_PER_SENTENCE } from "../../server/storedSegments";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/**
 * A Sentence's stored Segments in order. Intake never stores more than the
 * bound, so more means a broken Sentence, not one to read partially.
 */
export async function loadStoredSegments(
	ctx: QueryCtx,
	sentenceId: Id<"sentences">,
): Promise<Doc<"segments">[]> {
	const segments = await ctx.db
		.query("segments")
		.withIndex("by_sentence_id_and_index", (q) =>
			q.eq("sentenceId", sentenceId),
		)
		.take(MAX_SEGMENTS_PER_SENTENCE + 1);
	if (segments.length > MAX_SEGMENTS_PER_SENTENCE) {
		throw new Error(
			`A Sentence may contain at most ${MAX_SEGMENTS_PER_SENTENCE} Segments.`,
		);
	}
	return segments;
}
