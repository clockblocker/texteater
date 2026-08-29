import type { KnowledgeChange } from "dumrel";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { applyTrustedReadingKnowledgeChange } from "../../model/readingKnowledge";
import { replaceAccumulatedKnowledge } from "../../model/shadows";

type ReadingKnowledgeReference = {
	ownerReadingKey: string;
};

type StoredKnowledgeChange = ReadingKnowledgeReference & {
	knowledgeChangeKey: string;
	change: unknown;
};

type PersistedKnowledgeChange = {
	knowledgeChangeId: Id<"knowledgeChanges">;
	accumulatedKnowledgeId: Id<"accumulatedKnowledge">;
	deduplicated: boolean;
	change: unknown;
	knowledge: unknown;
};

function assertNonEmpty(value: string, name: string): void {
	if (value.trim().length === 0)
		throw new Error(`${name} must not be empty.`);
}

/** Persist one idempotent Knowledge Change and its accumulated Knowledge. */
export async function persistKnowledgeChange(
	ctx: MutationCtx,
	input: StoredKnowledgeChange,
): Promise<PersistedKnowledgeChange> {
	assertNonEmpty(input.knowledgeChangeKey, "knowledgeChangeKey");
	assertNonEmpty(input.ownerReadingKey, "ownerReadingKey");
	const existingChange = await ctx.db
		.query("knowledgeChanges")
		.withIndex("by_knowledge_change_key", (q) =>
			q.eq("knowledgeChangeKey", input.knowledgeChangeKey),
		)
		.unique();
	const existingAccumulated = await ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_owner_reading_key", (q) =>
			q.eq("ownerReadingKey", input.ownerReadingKey),
		)
		.unique();
	if (existingChange) {
		if (
			existingChange.ownerReadingKey !== input.ownerReadingKey ||
			!existingAccumulated
		) {
			throw new Error(
				"knowledgeChangeKey collides with a different Knowledge Change.",
			);
		}
		return {
			knowledgeChangeId: existingChange._id,
			accumulatedKnowledgeId: existingAccumulated._id,
			deduplicated: true,
			change: existingChange.change,
			knowledge: existingAccumulated.knowledge,
		};
	}

	const reading = await ctx.db
		.query("readings")
		.withIndex("by_reading_key", (q) =>
			q.eq("readingKey", input.ownerReadingKey),
		)
		.unique();
	if (!reading) throw new Error("Reading does not exist.");
	const change = input.change as KnowledgeChange;
	const knowledge = applyTrustedReadingKnowledgeChange(
		existingAccumulated?.knowledge,
		change as unknown as Record<string, unknown>,
	);
	const applied = { change, knowledge };
	if (applied.change.aspect === "semanticRelations") {
		throw new Error(
			"Semantic Relations are maintained atomically by Dumdict.",
		);
	}
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
			record: { ...record, knowledge: applied.knowledge },
		});
	}
	const now = Date.now();
	const accumulatedKnowledgeId = await replaceAccumulatedKnowledge(
		ctx,
		input.ownerReadingKey,
		applied.knowledge,
	);
	if (!accumulatedKnowledgeId) {
		throw new Error("A Knowledge Change must accumulate Knowledge.");
	}
	const knowledgeChangeId = await ctx.db.insert("knowledgeChanges", {
		knowledgeChangeKey: input.knowledgeChangeKey,
		ownerReadingKey: input.ownerReadingKey,
		change: applied.change,
		createdAt: now,
	});
	return {
		knowledgeChangeId,
		accumulatedKnowledgeId,
		deduplicated: false,
		...applied,
	};
}
