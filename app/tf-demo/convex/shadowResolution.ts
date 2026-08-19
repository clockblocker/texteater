import { v } from "convex/values";

import { internalQuery, type QueryCtx } from "./_generated/server";
import {
	descriptorFromStoredShadow,
	pendingShadowDescriptor,
	shadowIsCompatible,
} from "./model/shadows";

function locatorKeyFromRecord(value: unknown): string | null {
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
		typeof fields.targetPendingId !== "string"
	) {
		return null;
	}
	return JSON.stringify([
		fields.sourceReadingKey,
		fields.relation,
		fields.targetPendingId,
	]);
}

async function currentRevision(ctx: QueryCtx) {
	const state = await ctx.db
		.query("dictionaryState")
		.withIndex("by_key", (q) => q.eq("key", "global"))
		.unique();
	return `convex-${state?.revision ?? 0}`;
}

async function loadSelectionHandler(
	ctx: QueryCtx,
	args: {
		shadowId: import("./_generated/dataModel").Id<"shadows">;
		locatorKey: string;
	},
) {
	const [revision, pending, shadow] = await Promise.all([
		currentRevision(ctx),
		ctx.db
			.query("pendingSemanticRelations")
			.withIndex("by_locator_key", (q) =>
				q.eq("locatorKey", args.locatorKey),
			)
			.unique(),
		ctx.db.get(args.shadowId),
	]);
	let compatiblePending = false;
	try {
		compatiblePending =
			shadow !== null &&
			pending !== null &&
			pending.shadowId === args.shadowId &&
			locatorKeyFromRecord(pending.record) === args.locatorKey &&
			shadowIsCompatible(
				shadow,
				pendingShadowDescriptor(pending.record),
			) &&
			shadowIsCompatible(shadow, descriptorFromStoredShadow(shadow));
	} catch {
		compatiblePending = false;
	}
	return {
		revision,
		pendingRecord: compatiblePending ? (pending?.record ?? null) : null,
	};
}

export const loadPendingSelection = internalQuery({
	args: {
		shadowId: v.id("shadows"),
		locatorKey: v.string(),
	},
	returns: v.object({
		revision: v.string(),
		pendingRecord: v.union(v.null(), v.any()),
	}),
	handler: loadSelectionHandler,
});
