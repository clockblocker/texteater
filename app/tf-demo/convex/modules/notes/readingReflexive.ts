import { isRecord } from "common-utils";
import { v } from "convex/values";
import {
	type ReflexiveSlot,
	reflexiveSlotOf,
} from "../../../shared/reflexive-slot";
import type { QueryCtx } from "../../_generated/server";
import { findAccumulatedKnowledge } from "../../model/knowledgeCoverage";

/**
 * The Reflexive Slot of a Reading a Note names (ADR 0052), so the Note can
 * print that Reading's Citation. Null when its frame has none, or while no
 * Knowledge has given it a frame.
 */
export const reflexiveSlotValidator = v.union(
	v.null(),
	v.object({
		status: v.union(v.literal("Required"), v.literal("Optional")),
		governedCase: v.union(v.null(), v.literal("Acc"), v.literal("Dat")),
		/** The preposition the reflexive follows: `außer` in `außer sich sein`. */
		preposition: v.union(v.null(), v.string()),
	}),
);

/**
 * The Reflexive Slot in stored Knowledge. The stored value was checked by
 * Dumrel when it was written, so its frame is read as it stands.
 */
export function storedReflexiveSlot(knowledge: unknown): ReflexiveSlot | null {
	if (!isRecord(knowledge) || !Array.isArray(knowledge.valency)) return null;
	return reflexiveSlotOf(knowledge.valency);
}

/** The Reflexive Slot of a stored Reading, from its accumulated Knowledge. */
export async function loadReflexiveSlot(
	ctx: QueryCtx,
	readingKey: string,
): Promise<ReflexiveSlot | null> {
	const row = await findAccumulatedKnowledge(ctx, readingKey);
	return storedReflexiveSlot(row?.knowledge);
}
