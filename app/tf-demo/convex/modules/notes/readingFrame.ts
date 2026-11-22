import { isRecord } from "common-utils";
import { type Infer, v } from "convex/values";
import type { QueryCtx } from "../../_generated/server";
import { findAccumulatedKnowledge } from "../../model/knowledgeCoverage";
import { valencyPatternValidator } from "./readingKnowledgeValidator";

/**
 * A Reading's accumulated Valency Patterns (ADR 0034). Null while no
 * Knowledge has given the Reading any patterns.
 */
export const readingFrameValidator = v.union(
	v.null(),
	v.array(valencyPatternValidator),
);

type ReadingFrame = Infer<typeof readingFrameValidator>;

/**
 * The Valency Patterns in stored Knowledge. Dumrel checked the stored value
 * when it was written, so the patterns are read as they stand.
 */
function storedFrame(knowledge: unknown): ReadingFrame {
	if (!isRecord(knowledge) || !Array.isArray(knowledge.valency)) return null;
	return knowledge.valency as NonNullable<ReadingFrame>;
}

/** The Valency Patterns of a stored Reading, from its accumulated Knowledge. */
export async function loadReadingFrame(
	ctx: QueryCtx,
	readingKey: string,
): Promise<ReadingFrame> {
	const row = await findAccumulatedKnowledge(ctx, readingKey);
	return storedFrame(row?.knowledge);
}
