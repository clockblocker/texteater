import { v } from "convex/values";
import { directSemanticRelationValues } from "dumrel";

import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation } from "./_generated/server";
import {
	createDumdictTransaction,
	DICTIONARY_REVISION,
} from "./dumdictTransaction";
import {
	descriptorFromStoredShadow,
	pendingShadowDescriptor,
	shadowIsCompatible,
} from "./model/shadows";

function locatorFromRecord(value: unknown): {
	sourceReadingKey: string;
	relation: (typeof directSemanticRelationValues)[number];
	targetPendingId: string;
} | null {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	const locator = (value as Record<string, unknown>).locator;
	if (
		locator === null ||
		typeof locator !== "object" ||
		Array.isArray(locator)
	) {
		return null;
	}
	const fields = locator as Record<string, unknown>;
	if (
		typeof fields.sourceReadingKey !== "string" ||
		typeof fields.relation !== "string" ||
		!directSemanticRelationValues.includes(
			fields.relation as (typeof directSemanticRelationValues)[number],
		) ||
		typeof fields.targetPendingId !== "string"
	) {
		return null;
	}
	return {
		sourceReadingKey: fields.sourceReadingKey,
		relation:
			fields.relation as (typeof directSemanticRelationValues)[number],
		targetPendingId: fields.targetPendingId,
	};
}

function locatorKey(
	locator: NonNullable<ReturnType<typeof locatorFromRecord>>,
) {
	return JSON.stringify([
		locator.sourceReadingKey,
		locator.relation,
		locator.targetPendingId,
	]);
}

/** The exact pending reference a Shadow Note offered, if it still refers to that Shadow. */
async function loadPendingSelection(
	ctx: MutationCtx,
	args: { shadowId: Id<"shadows">; locatorKey: string },
) {
	const [pending, shadow] = await Promise.all([
		ctx.db
			.query("pendingSemanticRelations")
			.withIndex("by_locator_key", (q) =>
				q.eq("locatorKey", args.locatorKey),
			)
			.unique(),
		ctx.db.get(args.shadowId),
	]);
	const locator = locatorFromRecord(pending?.record);
	try {
		return shadow !== null &&
			pending !== null &&
			pending.shadowId === args.shadowId &&
			locator !== null &&
			locatorKey(locator) === args.locatorKey &&
			shadowIsCompatible(
				shadow,
				pendingShadowDescriptor(pending.record),
			) &&
			shadowIsCompatible(shadow, descriptorFromStoredShadow(shadow))
			? locator
			: null;
	} catch {
		return null;
	}
}

const shadowCleanupResultValidator = v.union(
	v.object({ status: v.literal("applied"), message: v.string() }),
	v.object({ status: v.literal("conflict"), message: v.string() }),
	v.object({
		status: v.literal("rejected"),
		code: v.string(),
		message: v.string(),
	}),
);

/**
 * Resolves one pending Shadow reference a Shadow Note offered, planning and
 * committing the relation cleanup in this transaction.
 */
export const cleanupPendingRelation = mutation({
	args: { shadowId: v.id("shadows"), locatorKey: v.string() },
	returns: shadowCleanupResultValidator,
	handler: async (ctx, args) => {
		const locator = await loadPendingSelection(ctx, args);
		if (!locator)
			return {
				status: "conflict" as const,
				message: "The exact pending Shadow reference no longer exists.",
			};
		const result = await createDumdictTransaction(ctx).cleanupRelations({
			baseRevision: DICTIONARY_REVISION,
			resolutions: [{ locator }],
		});
		if (result.status === "committed")
			return { status: "applied" as const, message: result.message };
		return result.status === "conflict"
			? {
					status: "conflict" as const,
					message: result.message ?? "Shadow cleanup conflicted.",
				}
			: {
					status: "rejected" as const,
					code: result.code,
					message: result.message ?? "Shadow cleanup was rejected.",
				};
	},
});
