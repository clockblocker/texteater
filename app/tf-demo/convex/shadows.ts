import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { foldedCanonicalForm } from "../server/linguisticIdentity";

import { internalMutation, internalQuery } from "./_generated/server";
import {
	attachPendingShadowReference,
	parsePendingShadowDescriptor,
	parseStructuralShadowReferences,
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
			const parsed = parsePendingShadowDescriptor(pending.record);
			if (!parsed.ok) {
				malformed += 1;
				continue;
			}
			const descriptor = parsed.value;
			const currentShadow = pending.shadowId
				? await ctx.db.get(pending.shadowId)
				: null;
			if (
				currentShadow &&
				shadowIsCompatible(currentShadow, descriptor) &&
				pending.targetFoldedCanonicalForm ===
					foldedCanonicalForm(descriptor)
			) {
				continue;
			}
			const shadowId = await attachPendingShadowReference(
				ctx,
				pending.record,
			);
			await ctx.db.patch(pending._id, {
				shadowId,
				targetFoldedCanonicalForm: foldedCanonicalForm(descriptor),
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
		async function backfillOwner(index: number): Promise<{
			changed: number;
			malformed: number;
		}> {
			const knowledge = result.page[index];
			if (!knowledge) return { changed: 0, malformed: 0 };
			const expected = parseStructuralShadowReferences(
				knowledge.knowledge,
			);
			if (!expected.ok) {
				const rest = await backfillOwner(index + 1);
				return { changed: rest.changed, malformed: rest.malformed + 1 };
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
			const currentChanged =
				beforeFingerprint !== afterFingerprint ||
				before.length !== expected.value.length;
			const rest = await backfillOwner(index + 1);
			return {
				changed: rest.changed + Number(currentChanged),
				malformed: rest.malformed,
			};
		}
		const { changed, malformed } = await backfillOwner(0);
		return {
			continueCursor: result.continueCursor,
			isDone: result.isDone,
			visited: result.page.length,
			changed,
			malformed,
		};
	},
});

export const auditPendingShadowReferencesPage = internalQuery({
	args: { paginationOpts: paginationOptsValidator },
	returns: auditPageValidator,
	handler: async (ctx, { paginationOpts }) => {
		assertBoundedPageSize(paginationOpts.numItems);
		const result = await ctx.db
			.query("pendingSemanticRelations")
			.paginate(paginationOpts);
		const audited = await Promise.all(
			result.page.map(async (pending) => {
				const parsed = parsePendingShadowDescriptor(pending.record);
				if (!parsed.ok) return "malformed" as const;
				const descriptor = parsed.value;
				if (!pending.shadowId) return "missing" as const;
				const shadow = await ctx.db.get(pending.shadowId);
				if (
					!shadow ||
					!shadowIsCompatible(shadow, descriptor) ||
					pending.targetFoldedCanonicalForm !==
						foldedCanonicalForm(descriptor)
				) {
					return "mismatched" as const;
				}
				return "valid" as const;
			}),
		);
		return {
			continueCursor: result.continueCursor,
			isDone: result.isDone,
			visited: result.page.length,
			valid: audited.filter((status) => status === "valid").length,
			missing: audited.filter((status) => status === "missing").length,
			mismatched: audited.filter((status) => status === "mismatched")
				.length,
			malformed: audited.filter((status) => status === "malformed")
				.length,
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
		// Only an unparseable stored Knowledge counts as malformed; DB and code
		// errors propagate.
		for (const reference of result.page) {
			const [shadow, accumulated] = await Promise.all([
				ctx.db.get(reference.shadowId),
				ctx.db
					.query("accumulatedKnowledge")
					.withIndex("by_owner_reading_key", (q) =>
						q.eq("ownerReadingKey", reference.ownerReadingKey),
					)
					.unique(),
			]);
			const references = accumulated
				? parseStructuralShadowReferences(accumulated.knowledge)
				: null;
			if (references && !references.ok) {
				malformed += 1;
				continue;
			}
			const expected = references?.value.find(
				({ aspect, path }) =>
					aspect === reference.aspect && path === reference.path,
			);
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
