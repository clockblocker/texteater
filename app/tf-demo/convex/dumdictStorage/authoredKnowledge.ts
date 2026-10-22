import { canonicalJson, isRecord } from "common-utils";
import { authoredReading, selectAuthoredArticle } from "dumcorpus/inventories";
import type { ReadingEntry } from "dumdict/planning";
import type { MutationCtx } from "../_generated/server";
import { type AnyRecord, requireRecord } from "../model/readingKnowledge";
import { replaceAccumulatedKnowledge } from "../model/shadows";
import { findReading, withoutSemanticRelationTargets } from "./storage";

type GermanReadingEntry = ReadingEntry<"de">;

/**
 * Completes reviewed component entries outside a planned commit, without
 * replacing existing Knowledge or creating encounters.
 */
export async function completeAuthoredComponentKnowledge(
	ctx: MutationCtx,
	reading: unknown,
) {
	const authored = authoredReading(reading);
	if (!authored) return false;
	const stored = await findReading(ctx, authored.reading);
	if (!stored) return false;
	const accumulated = await ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_owner_reading_key", (q) =>
			q.eq("ownerReadingKey", stored.readingKey),
		)
		.unique();
	const entry = await ctx.db.get(stored.entryId);
	if (!entry) return false;
	const record = requireRecord(entry.record, "Reading Entry record");
	const knowledge = {
		...optionalRecord(withoutSemanticRelationTargets(authored.knowledge)),
		...optionalRecord(record.knowledge),
		...accumulated?.knowledge,
	};
	const knowledgeJson = canonicalJson(knowledge);
	if (
		record.knowledge !== undefined &&
		canonicalJson(record.knowledge) === knowledgeJson &&
		accumulated !== null &&
		canonicalJson(accumulated.knowledge) === knowledgeJson
	)
		return false;
	await ctx.db.patch(entry._id, { record: { ...record, knowledge } });
	// An authored member stores all its Knowledge (ADR 0021).
	await replaceAccumulatedKnowledge(ctx, stored.readingKey, knowledge, {
		status: "Full",
	});
	return true;
}

function optionalRecord(value: unknown): AnyRecord | null {
	return isRecord(value) ? value : null;
}

/** A reviewed article's Reading Entry starts with its authored Knowledge. */
export function withAuthoredArticleKnowledge(
	entry: GermanReadingEntry,
): GermanReadingEntry {
	const authored = selectAuthoredArticle(entry.reading);
	if (!authored) return entry;
	return {
		...entry,
		// Authored Knowledge is Dumdict Knowledge for its own Reading.
		knowledge: {
			...optionalRecord(
				withoutSemanticRelationTargets(authored.knowledge),
			),
			...entry.knowledge,
		} as GermanReadingEntry["knowledge"],
	};
}
