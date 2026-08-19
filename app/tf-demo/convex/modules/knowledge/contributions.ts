import type { Infer } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { readingValue } from "../../model/occurrenceAttestations";
import { replaceAccumulatedKnowledge } from "../../model/shadows";
import type { knowledgeOwnerKindValidator } from "../../model/validators";

type KnowledgeOwnerKind = Infer<typeof knowledgeOwnerKindValidator>;

type KnowledgeOwnerReference = {
	ownerKind: KnowledgeOwnerKind;
	ownerKey: string;
};

type KnowledgeContribution = KnowledgeOwnerReference & {
	contributionKey: string;
	change: unknown;
	knowledge: unknown;
};

type PersistedKnowledgeContribution = {
	contributionId: Id<"knowledgeContributions">;
	accumulatedKnowledgeId: Id<"accumulatedKnowledge">;
	deduplicated: boolean;
};

function assertNonEmpty(value: string, name: string): void {
	if (value.trim().length === 0)
		throw new Error(`${name} must not be empty.`);
}

export async function getKnowledgeOwner(
	ctx: QueryCtx,
	input: KnowledgeOwnerReference,
) {
	const accumulated = await ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_owner_kind_and_owner_key", (q) =>
			q.eq("ownerKind", input.ownerKind).eq("ownerKey", input.ownerKey),
		)
		.unique();
	if (input.ownerKind === "Lemma") {
		const lemma = await ctx.db
			.query("lemmas")
			.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", input.ownerKey))
			.unique();
		return lemma
			? {
					owner: {
						language: lemma.language,
						family: lemma.family,
						kind: lemma.kind,
						canonicalForm: lemma.canonicalForm,
						coreFeatures: lemma.coreFeatures,
					},
					...(accumulated
						? { knowledge: accumulated.knowledge }
						: {}),
				}
			: null;
	}
	const reading = await ctx.db
		.query("readings")
		.withIndex("by_reading_key", (q) => q.eq("readingKey", input.ownerKey))
		.unique();
	if (!reading) return null;
	const lemma = await ctx.db.get(reading.lemmaId);
	return lemma
		? {
				owner: readingValue(reading, lemma),
				...(accumulated ? { knowledge: accumulated.knowledge } : {}),
			}
		: null;
}

/** Persist one idempotent contribution and its accumulated Knowledge. */
export async function persistKnowledgeContribution(
	ctx: MutationCtx,
	input: KnowledgeContribution,
): Promise<PersistedKnowledgeContribution> {
	assertNonEmpty(input.contributionKey, "contributionKey");
	assertNonEmpty(input.ownerKey, "ownerKey");
	const existingContribution = await ctx.db
		.query("knowledgeContributions")
		.withIndex("by_contribution_key", (q) =>
			q.eq("contributionKey", input.contributionKey),
		)
		.unique();
	const existingAccumulated = await ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_owner_kind_and_owner_key", (q) =>
			q.eq("ownerKind", input.ownerKind).eq("ownerKey", input.ownerKey),
		)
		.unique();
	if (existingContribution) {
		if (
			existingContribution.ownerKind !== input.ownerKind ||
			existingContribution.ownerKey !== input.ownerKey ||
			!existingAccumulated
		) {
			throw new Error(
				"contributionKey collides with a different contribution.",
			);
		}
		return {
			contributionId: existingContribution._id,
			accumulatedKnowledgeId: existingAccumulated._id,
			deduplicated: true,
		};
	}

	if (input.ownerKind === "Lemma") {
		const lemma = await ctx.db
			.query("lemmas")
			.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", input.ownerKey))
			.unique();
		if (!lemma) throw new Error("Knowledge owner Lemma does not exist.");
	} else {
		const reading = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", input.ownerKey),
			)
			.unique();
		if (!reading)
			throw new Error("Knowledge owner Reading does not exist.");
		const entry = await ctx.db
			.query("readingEntries")
			.withIndex("by_reading_id", (q) => q.eq("readingId", reading._id))
			.unique();
		if (entry) {
			const record =
				entry.record !== null &&
				typeof entry.record === "object" &&
				!Array.isArray(entry.record)
					? entry.record
					: {};
			await ctx.db.patch(entry._id, {
				record: { ...record, knowledge: input.knowledge },
			});
		}
	}
	const now = Date.now();
	const accumulatedKnowledgeId = await replaceAccumulatedKnowledge(
		ctx,
		input.ownerKind,
		input.ownerKey,
		input.knowledge,
	);
	if (!accumulatedKnowledgeId) {
		throw new Error("A Knowledge contribution must accumulate Knowledge.");
	}
	const contributionId = await ctx.db.insert("knowledgeContributions", {
		contributionKey: input.contributionKey,
		ownerKind: input.ownerKind,
		ownerKey: input.ownerKey,
		change: input.change,
		createdAt: now,
	});
	return { contributionId, accumulatedKnowledgeId, deduplicated: false };
}
