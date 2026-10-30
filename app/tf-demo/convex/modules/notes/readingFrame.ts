import { isRecord } from "common-utils";
import { type Infer, v } from "convex/values";
import type { QueryCtx } from "../../_generated/server";
import { findAccumulatedKnowledge } from "../../model/knowledgeCoverage";
import { valencySlotValidator } from "./readingKnowledgeValidator";

/**
 * A Reading's Valency Frame, which a Note that names the Reading prints a
 * Surface's slotted line from (#1293). Null while no Knowledge has given
 * the Reading a frame.
 */
export const readingFrameValidator = v.union(
	v.null(),
	v.array(valencySlotValidator),
);

type ReadingFrame = Infer<typeof readingFrameValidator>;

/**
 * The Valency Frame in stored Knowledge. Dumrel checked the stored value
 * when it was written, so the frame is read as it stands.
 */
function storedFrame(knowledge: unknown): ReadingFrame {
	if (!isRecord(knowledge) || !Array.isArray(knowledge.valency)) return null;
	return knowledge.valency as NonNullable<ReadingFrame>;
}

/** The Valency Frame of a stored Reading, from its accumulated Knowledge. */
export async function loadReadingFrame(
	ctx: QueryCtx,
	readingKey: string,
): Promise<ReadingFrame> {
	const row = await findAccumulatedKnowledge(ctx, readingKey);
	return storedFrame(row?.knowledge);
}
