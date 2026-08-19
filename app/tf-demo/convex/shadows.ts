import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import {
	internalMutation,
	internalQuery,
	type QueryCtx,
} from "./_generated/server";
import {
	attachPendingShadowReference,
	collectStructuralShadowReferences,
	pendingShadowDescriptor,
	shadowIsCompatible,
	structuralShadowLocatorKey,
	syncStructuralShadowReferences,
} from "./model/shadows";

const MAX_BACKFILL_PAGE_SIZE = 50;
const MAX_STRUCTURAL_BACKFILL_OWNERS = 8;

const backfillPageValidator = v.object({
	continueCursor: v.string(),
	isDone: v.boolean(),
	visited: v.number(),
	changed: v.number(),
	malformed: v.number(),
});

const auditPageValidator = v.object({
	continueCursor: v.string(),
	isDone: v.boolean(),
	visited: v.number(),
	valid: v.number(),
	missing: v.number(),
	mismatched: v.number(),
	malformed: v.number(),
});

function assertBoundedPageSize(numItems: number): void {
	if (
		!Number.isSafeInteger(numItems) ||
		numItems < 1 ||
		numItems > MAX_BACKFILL_PAGE_SIZE
	) {
		throw new Error(
			`Shadow maintenance pages support 1 to ${MAX_BACKFILL_PAGE_SIZE} items.`,
		);
	}
}

export const backfillPendingShadowReferencesPage = internalMutation({
	args: { paginationOpts: paginationOptsValidator },
	returns: backfillPageValidator,
	handler: async (ctx, { paginationOpts }) => {
		assertBoundedPageSize(paginationOpts.numItems);
		const result = await ctx.db
			.query("pendingSemanticRelations")
			.paginate(paginationOpts);
		let changed = 0;
		let malformed = 0;
		for (const pending of result.page) {
			let descriptor: ReturnType<typeof pendingShadowDescriptor>;
			try {
				descriptor = pendingShadowDescriptor(pending.record);
			} catch {
				malformed += 1;
				continue;
			}
			const currentShadow = pending.shadowId
				? await ctx.db.get(pending.shadowId)
				: null;
			if (
				currentShadow &&
				shadowIsCompatible(currentShadow, descriptor) &&
				pending.targetCanonicalForm === descriptor.canonicalForm
			) {
				continue;
			}
			const shadowId = await attachPendingShadowReference(
				ctx,
				pending.record,
			);
			await ctx.db.patch(pending._id, {
				shadowId,
				targetCanonicalForm: descriptor.canonicalForm,
			});
			changed += 1;
		}
		return {
			continueCursor: result.continueCursor,
			isDone: result.isDone,
			visited: result.page.length,
			changed,
			malformed,
		};
	},
});

export const backfillStructuralShadowReferencesPage = internalMutation({
	args: { paginationOpts: paginationOptsValidator },
	returns: backfillPageValidator,
	handler: async (ctx, { paginationOpts }) => {
		assertBoundedPageSize(paginationOpts.numItems);
		if (paginationOpts.numItems > MAX_STRUCTURAL_BACKFILL_OWNERS) {
			throw new Error(
				`Structural Shadow backfill supports at most ${MAX_STRUCTURAL_BACKFILL_OWNERS} Reading owners per page.`,
			);
		}
		const result = await ctx.db
			.query("accumulatedKnowledge")
			.paginate(paginationOpts);
		let changed = 0;
		let malformed = 0;
		for (const knowledge of result.page) {
			let expected: ReturnType<typeof collectStructuralShadowReferences>;
			try {
				expected = collectStructuralShadowReferences(
					knowledge.knowledge,
				);
			} catch {
				malformed += 1;
				continue;
			}
			const before = await ctx.db
				.query("structuralShadowReferences")
				.withIndex("by_owner_reading_key", (q) =>
					q.eq("ownerReadingKey", knowledge.ownerReadingKey),
				)
				.take(201);
			await syncStructuralShadowReferences(
				ctx,
				knowledge.ownerReadingKey,
				knowledge.knowledge,
			);
			const beforeFingerprint = before
				.map(({ locatorKey, shadowId }) => `${locatorKey}:${shadowId}`)
				.sort()
				.join("\n");
			const after = await ctx.db
				.query("structuralShadowReferences")
				.withIndex("by_owner_reading_key", (q) =>
					q.eq("ownerReadingKey", knowledge.ownerReadingKey),
				)
				.take(201);
			const afterFingerprint = after
				.map(({ locatorKey, shadowId }) => `${locatorKey}:${shadowId}`)
				.sort()
				.join("\n");
			if (
				beforeFingerprint !== afterFingerprint ||
				before.length !== expected.length
			) {
				changed += 1;
			}
		}
		return {
			continueCursor: result.continueCursor,
			isDone: result.isDone,
			visited: result.page.length,
			changed,
			malformed,
		};
	},
});

async function loadExpectedStructuralReference(
	ctx: QueryCtx,
	ownerReadingKey: string,
	aspect: "morphologicalTree" | "lexicalBreakdown",
	path: string,
) {
	const accumulated = await ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_owner_reading_key", (q) =>
			q.eq("ownerReadingKey", ownerReadingKey),
		)
		.unique();
	if (!accumulated) return null;
	return (
		collectStructuralShadowReferences(accumulated.knowledge).find(
			(reference) =>
				reference.aspect === aspect && reference.path === path,
		) ?? null
	);
}

export const auditPendingShadowReferencesPage = internalQuery({
	args: { paginationOpts: paginationOptsValidator },
	returns: auditPageValidator,
	handler: async (ctx, { paginationOpts }) => {
		assertBoundedPageSize(paginationOpts.numItems);
		const result = await ctx.db
			.query("pendingSemanticRelations")
			.paginate(paginationOpts);
		let valid = 0;
		let missing = 0;
		let mismatched = 0;
		let malformed = 0;
		for (const pending of result.page) {
			try {
				const descriptor = pendingShadowDescriptor(pending.record);
				if (!pending.shadowId) {
					missing += 1;
					continue;
				}
				const shadow = await ctx.db.get(pending.shadowId);
				if (
					!shadow ||
					!shadowIsCompatible(shadow, descriptor) ||
					pending.targetCanonicalForm !== descriptor.canonicalForm
				) {
					mismatched += 1;
				} else valid += 1;
			} catch {
				malformed += 1;
			}
		}
		return {
			continueCursor: result.continueCursor,
			isDone: result.isDone,
			visited: result.page.length,
			valid,
			missing,
			mismatched,
			malformed,
		};
	},
});

export const auditStructuralShadowReferencesPage = internalQuery({
	args: { paginationOpts: paginationOptsValidator },
	returns: auditPageValidator,
	handler: async (ctx, { paginationOpts }) => {
		assertBoundedPageSize(paginationOpts.numItems);
		const result = await ctx.db
			.query("structuralShadowReferences")
			.paginate(paginationOpts);
		let valid = 0;
		let missing = 0;
		let mismatched = 0;
		let malformed = 0;
		for (const reference of result.page) {
			try {
				const [shadow, expected] = await Promise.all([
					ctx.db.get(reference.shadowId),
					loadExpectedStructuralReference(
						ctx,
						reference.ownerReadingKey,
						reference.aspect,
						reference.path,
					),
				]);
				if (!shadow || !expected) {
					missing += 1;
					continue;
				}
				const expectedLocator = structuralShadowLocatorKey(
					reference.ownerReadingKey,
					reference.aspect,
					reference.path,
				);
				if (
					reference.locatorKey !== expectedLocator ||
					!shadowIsCompatible(shadow, expected.descriptor)
				) {
					mismatched += 1;
				} else valid += 1;
			} catch {
				malformed += 1;
			}
		}
		return {
			continueCursor: result.continueCursor,
			isDone: result.isDone,
			visited: result.page.length,
			valid,
			missing,
			mismatched,
			malformed,
		};
	},
});
