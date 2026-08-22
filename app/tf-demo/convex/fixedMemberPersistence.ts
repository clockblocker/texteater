import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
	applyDumdictPlanInTransaction,
	hasDumdictLemma,
	loadDumdictReadingEntryByKey,
	loadDumdictRevision,
} from "./dumdictStorage";
import { sameCanonicalJson } from "./model/canonicalJson";
import { ensureAccumulatedKnowledgeStatus } from "./model/shadows";
import {
	dictionaryPlanValidator,
	lemmaValueValidator,
} from "./model/validators";

export const commitFixedLemma = internalMutation({
	args: { lemma: lemmaValueValidator },
	returns: v.union(
		v.object({ status: v.literal("loaded") }),
		v.object({ status: v.literal("unchanged") }),
	),
	handler: async (ctx, { lemma }) => {
		if (await hasDumdictLemma(ctx, lemma)) {
			return { status: "unchanged" as const };
		}
		const revision = await loadDumdictRevision(ctx);
		const committed = await applyDumdictPlanInTransaction(ctx, {
			baseRevision: revision,
			changes: [
				{
					type: "createLemma",
					record: { lemma },
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "lemmaMissing", lemma },
					],
				},
			],
		});
		if (committed.status === "conflict") {
			throw new Error("Fixed Lemma ordinary commit conflicted.");
		}
		return { status: "loaded" as const };
	},
});

export const commitFixedMember = internalMutation({
	args: {
		plan: dictionaryPlanValidator,
		readingKey: v.string(),
		expectedEntry: v.any(),
	},
	returns: v.union(
		v.object({ status: v.literal("loaded") }),
		v.object({ status: v.literal("unchanged") }),
		v.object({ status: v.literal("conflict") }),
	),
	handler: async (ctx, args) => {
		const before = await loadDumdictReadingEntryByKey(ctx, args.readingKey);
		if (before && !sameCanonicalJson(before, args.expectedEntry)) {
			throw new Error(
				"Fixed member collides with incompatible ordinary Reading Entry content.",
			);
		}
		const accumulated = await ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_owner_reading_key", (q) =>
				q.eq("ownerReadingKey", args.readingKey),
			)
			.unique();
		if (before && accumulated?.status === "Full") {
			return { status: "unchanged" as const };
		}

		if (!before) {
			const committed = await applyDumdictPlanInTransaction(
				ctx,
				args.plan,
			);
			if (committed.status === "conflict") {
				return { status: "conflict" as const };
			}
		}
		const stored = await loadDumdictReadingEntryByKey(ctx, args.readingKey);
		if (!stored || !sameCanonicalJson(stored, args.expectedEntry)) {
			throw new Error(
				"Fixed member commit did not produce the exact ordinary Reading Entry.",
			);
		}
		await ensureAccumulatedKnowledgeStatus(ctx, args.readingKey, "Full");
		return { status: "loaded" as const };
	},
});
