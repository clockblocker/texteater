import { v } from "convex/values";
import { readingFingerprint } from "dumling/reading";
import type { Lemma, Reading } from "dumling/types";
import { ParsingError, parseAsGrammaticalRelationClaim } from "dumrel";
import type { GrammaticalRelationClaim } from "dumrel/types";
import { lemmaIdentityKey } from "../server/linguisticIdentity";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { createDumdictTransaction } from "./dumdictTransaction";
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
		const dictionary = createDumdictTransaction(ctx);
		if (await dictionary.containsLemma(lemma)) {
			return { status: "unchanged" as const };
		}
		const revision = await dictionary.readRevision();
		const committed = await dictionary.commit({
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
		const dictionary = createDumdictTransaction(ctx);
		const before = await dictionary.loadReadingEntry(args.readingKey);
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
			const committed = await dictionary.commit(args.plan);
			if (committed.status === "conflict") {
				return { status: "conflict" as const };
			}
		}
		const stored = await dictionary.loadReadingEntry(args.readingKey);
		if (!stored || !sameCanonicalJson(stored, args.expectedEntry)) {
			throw new Error(
				"Fixed member commit did not produce the exact ordinary Reading Entry.",
			);
		}
		await ensureAccumulatedKnowledgeStatus(ctx, args.readingKey, "Full");
		return { status: "loaded" as const };
	},
});

export const commitFixedGrammaticalRelation = internalMutation({
	args: { claim: v.any() },
	returns: v.union(
		v.object({ status: v.literal("loaded") }),
		v.object({ status: v.literal("unchanged") }),
	),
	handler: async (ctx, { claim: unchecked }) => {
		const parsed = parseAsGrammaticalRelationClaim(unchecked);
		if (parsed instanceof ParsingError) throw parsed;
		const claim = parsed as GrammaticalRelationClaim;
		if (sameEndpoint(claim.source, claim.target)) {
			throw new Error("A Grammatical Relation cannot be a self-edge.");
		}
		if (claim.endpointKind === "reading") {
			const source = await readingByValue(ctx, claim.source);
			const target = await readingByValue(ctx, claim.target);
			if (!source || !target) {
				throw new Error(
					"Fixed grammatical Reading endpoint is not loaded.",
				);
			}
			const existing = await ctx.db
				.query("grammaticalRelationEdges")
				.withIndex(
					"by_source_reading_id_and_relation_and_target_reading_id",
					(q) =>
						q
							.eq("sourceReadingId", source._id)
							.eq("relation", claim.relation)
							.eq("targetReadingId", target._id),
				)
				.unique();
			if (existing) {
				return { status: "unchanged" as const };
			}
			await ctx.db.insert("grammaticalRelationEdges", {
				endpointKind: "reading",
				sourceReadingId: source._id,
				targetReadingId: target._id,
				relation: claim.relation,
			});
			return { status: "loaded" as const };
		}

		const source = await lemmaByValue(ctx, claim.source);
		const target = await lemmaByValue(ctx, claim.target);
		if (!source || !target) {
			throw new Error("Fixed grammatical Lemma endpoint is not loaded.");
		}
		const existing = await ctx.db
			.query("grammaticalRelationEdges")
			.withIndex(
				"by_source_lemma_id_and_relation_and_target_lemma_id",
				(q) =>
					q
						.eq("sourceLemmaId", source._id)
						.eq("relation", claim.relation)
						.eq("targetLemmaId", target._id),
			)
			.unique();
		if (existing) {
			return { status: "unchanged" as const };
		}
		await ctx.db.insert("grammaticalRelationEdges", {
			endpointKind: "lemma",
			sourceLemmaId: source._id,
			targetLemmaId: target._id,
			relation: claim.relation,
		});
		return { status: "loaded" as const };
	},
});

function readingByValue(ctx: MutationCtx, reading: Reading) {
	return ctx.db
		.query("readings")
		.withIndex("by_reading_key", (q) =>
			q.eq("readingKey", readingFingerprint(reading)),
		)
		.unique();
}

function lemmaByValue(ctx: MutationCtx, lemma: Lemma) {
	return ctx.db
		.query("lemmas")
		.withIndex("by_lemma_key", (q) =>
			q.eq("lemmaKey", lemmaIdentityKey(lemma)),
		)
		.unique();
}

function sameEndpoint(left: Lemma | Reading, right: Lemma | Reading): boolean {
	return "emojiDescription" in left && "emojiDescription" in right
		? readingFingerprint(left) === readingFingerprint(right)
		: !("emojiDescription" in left) &&
				!("emojiDescription" in right) &&
				lemmaIdentityKey(left) === lemmaIdentityKey(right);
}
