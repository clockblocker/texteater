import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { pruneReadingReferences } from "../server/textDeletion";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	action,
	internalAction,
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "./_generated/server";
import { replaceAccumulatedKnowledge } from "./model/shadows";

const BATCH_SIZE = 400;
const MAX_BATCHES = 100;
const MAX_PAGES = 1_000;
const MAX_SENTENCES_PER_TEXT = 9;
const MAX_SEGMENTS_PER_SENTENCE = 512;
const PAGE_SIZE = 100;
const DESCRIPTOR_PAGE_SIZE = 20;

const sharedTableNames = [
	"resolutionSessions",
	"structuralShadowReferences",
	"knowledgeContributions",
	"accumulatedKnowledge",
	"pendingSemanticRelations",
	"shadows",
	"attestations",
	"visitorClicks",
	"ownedSurfaces",
	"readingEntries",
	"readings",
	"dictionaryLemmas",
	"surfaces",
	"lemmas",
	"segments",
	"sentences",
	"texts",
	"dictionaryState",
] as const;

function assertVisitorId(visitorId: string): void {
	if (visitorId.trim().length === 0 || visitorId.length > 200) {
		throw new Error("visitorId must contain 1 to 200 characters.");
	}
}

function optionalRecord(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

async function bumpDictionaryRevision(ctx: MutationCtx): Promise<void> {
	const state = await ctx.db
		.query("dictionaryState")
		.withIndex("by_key", (q) => q.eq("key", "global"))
		.unique();
	if (state) await ctx.db.patch(state._id, { revision: state.revision + 1 });
	else await ctx.db.insert("dictionaryState", { key: "global", revision: 1 });
}

export const clearSharedDataBatch = internalMutation({
	args: {},
	returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
	handler: async (ctx) => {
		const sessions = await ctx.db
			.query("resolutionSessions")
			.take(BATCH_SIZE);
		if (sessions.length > 0) {
			for (const session of sessions) await ctx.db.delete(session._id);
			return { deleted: sessions.length, hasMore: true };
		}
		let deleted = 0;
		let hasMore = false;
		for (const tableName of sharedTableNames.slice(1)) {
			const documents = await ctx.db.query(tableName).take(BATCH_SIZE);
			for (const document of documents) {
				await ctx.db.delete(document._id);
				deleted += 1;
			}
			if (documents.length === BATCH_SIZE) hasMore = true;
		}
		return { deleted, hasMore };
	},
});

export const clearVisitorDataBatch = internalMutation({
	args: { visitorId: v.string() },
	returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
	handler: async (ctx, { visitorId }) => {
		assertVisitorId(visitorId);
		const sessions = await ctx.db
			.query("resolutionSessions")
			.withIndex("by_visitor_id_and_updated_at", (q) =>
				q.eq("visitorId", visitorId),
			)
			.take(BATCH_SIZE);
		for (const session of sessions) await ctx.db.delete(session._id);
		const clicks = await ctx.db
			.query("visitorClicks")
			.withIndex("by_visitor_id_and_clicked_at", (q) =>
				q.eq("visitorId", visitorId),
			)
			.take(BATCH_SIZE - sessions.length);
		for (const click of clicks) await ctx.db.delete(click._id);
		const deleted = sessions.length + clicks.length;
		return {
			deleted,
			hasMore: deleted === BATCH_SIZE,
		};
	},
});

export const resetDemoDataBatch = internalMutation({
	args: {},
	returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
	handler: async (ctx) => {
		const sessions = await ctx.db
			.query("resolutionSessions")
			.take(BATCH_SIZE);
		if (sessions.length > 0) {
			for (const session of sessions) await ctx.db.delete(session._id);
			return { deleted: sessions.length, hasMore: true };
		}
		let deleted = 0;
		let hasMore = false;
		for (const tableName of sharedTableNames.slice(1)) {
			const documents = await ctx.db.query(tableName).take(BATCH_SIZE);
			for (const document of documents) {
				await ctx.db.delete(document._id);
				deleted += 1;
			}
			if (documents.length === BATCH_SIZE) hasMore = true;
		}
		return { deleted, hasMore };
	},
});

const textAnalysisCandidatesValidator = v.object({
	readingIds: v.array(v.id("readings")),
});

const readingDescriptorValidator = v.object({
	readingId: v.id("readings"),
	readingKey: v.string(),
	lemmaId: v.id("lemmas"),
	lemmaKey: v.string(),
	hasRemainingSource: v.boolean(),
});

const mutationPageValidator = v.object({
	continueCursor: v.string(),
	isDone: v.boolean(),
	patched: v.number(),
});

export const getTextAnalysisCandidates = internalQuery({
	args: { textId: v.id("texts") },
	returns: v.union(v.null(), textAnalysisCandidatesValidator),
	handler: async (ctx, { textId }) => {
		if (!(await ctx.db.get(textId))) return null;
		const sentences = await ctx.db
			.query("sentences")
			.withIndex("by_text_id_and_position", (q) => q.eq("textId", textId))
			.take(MAX_SENTENCES_PER_TEXT + 1);
		if (sentences.length > MAX_SENTENCES_PER_TEXT) {
			throw new Error(
				`Analysis stripping supports at most ${MAX_SENTENCES_PER_TEXT} Sentences per Text.`,
			);
		}
		const attestationIds = new Set<Id<"attestations">>();
		for (const sentence of sentences) {
			const segments = await ctx.db
				.query("segments")
				.withIndex("by_sentence_id_and_index", (q) =>
					q.eq("sentenceId", sentence._id),
				)
				.take(MAX_SEGMENTS_PER_SENTENCE + 1);
			if (segments.length > MAX_SEGMENTS_PER_SENTENCE) {
				throw new Error(
					`Analysis stripping supports at most ${MAX_SEGMENTS_PER_SENTENCE} Segments per Sentence.`,
				);
			}
			for (const segment of segments) {
				if (segment.attestationMembership) {
					attestationIds.add(
						segment.attestationMembership.attestationId,
					);
				}
			}
		}
		const attestations = await Promise.all(
			[...attestationIds].map((id) => ctx.db.get(id)),
		);
		return {
			readingIds: [
				...new Set(
					attestations.flatMap((row) => (row ? [row.readingId] : [])),
				),
			],
		};
	},
});

export const stripTextAnalysisGraphBatch = internalMutation({
	args: { textId: v.id("texts") },
	returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
	handler: async (ctx, { textId }) => {
		if (!(await ctx.db.get(textId))) return { deleted: 0, hasMore: false };
		const sentences = await ctx.db
			.query("sentences")
			.withIndex("by_text_id_and_position", (q) => q.eq("textId", textId))
			.take(MAX_SENTENCES_PER_TEXT + 1);
		if (sentences.length > MAX_SENTENCES_PER_TEXT) {
			throw new Error(
				`Analysis stripping supports at most ${MAX_SENTENCES_PER_TEXT} Sentences per Text.`,
			);
		}

		for (const sentence of sentences) {
			const sessions = await ctx.db
				.query("resolutionSessions")
				.withIndex("by_sentence_id", (q) =>
					q.eq("sentenceId", sentence._id),
				)
				.take(BATCH_SIZE);
			if (sessions.length > 0) {
				for (const session of sessions) {
					await ctx.db.delete(session._id);
				}
				return { deleted: sessions.length, hasMore: true };
			}
			const segments = await ctx.db
				.query("segments")
				.withIndex("by_sentence_id_and_index", (q) =>
					q.eq("sentenceId", sentence._id),
				)
				.take(BATCH_SIZE);
			for (const segment of segments) {
				const clicks = await ctx.db
					.query("visitorClicks")
					.withIndex("by_segment_id", (q) =>
						q.eq("segmentId", segment._id),
					)
					.take(BATCH_SIZE);
				if (clicks.length > 0) {
					for (const click of clicks) await ctx.db.delete(click._id);
					return { deleted: clicks.length, hasMore: true };
				}

				const attestationId =
					segment.attestationMembership?.attestationId;
				await ctx.db.delete(segment._id);
				let deleted = 1;
				if (attestationId) {
					const survivor = await ctx.db
						.query("segments")
						.withIndex("by_attestation_id", (q) =>
							q.eq(
								"attestationMembership.attestationId",
								attestationId,
							),
						)
						.first();
					if (!survivor && (await ctx.db.get(attestationId))) {
						await ctx.db.delete(attestationId);
						deleted += 1;
					}
				}
				return { deleted, hasMore: true };
			}
		}
		return { deleted: 0, hasMore: false };
	},
});

export const describeReadingCleanupCandidates = internalQuery({
	args: { readingIds: v.array(v.id("readings")) },
	returns: v.array(readingDescriptorValidator),
	handler: async (ctx, { readingIds }) => {
		if (readingIds.length > DESCRIPTOR_PAGE_SIZE) {
			throw new Error(
				`Describe at most ${DESCRIPTOR_PAGE_SIZE} Readings per call.`,
			);
		}
		const descriptors = [];
		for (const readingId of readingIds) {
			const reading = await ctx.db.get(readingId);
			if (!reading) continue;
			const [lemma, attestation] = await Promise.all([
				ctx.db.get(reading.lemmaId),
				ctx.db
					.query("attestations")
					.withIndex("by_reading_id", (q) =>
						q.eq("readingId", readingId),
					)
					.first(),
			]);
			if (!lemma) continue;
			descriptors.push({
				readingId,
				readingKey: reading.readingKey,
				lemmaId: lemma._id,
				lemmaKey: lemma.lemmaKey,
				hasRemainingSource: Boolean(attestation),
			});
		}
		return descriptors;
	},
});

export const pruneReadingEntryRelationsPage = internalMutation({
	args: {
		doomedReadingKeys: v.array(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	returns: mutationPageValidator,
	handler: async (ctx, { doomedReadingKeys, paginationOpts }) => {
		const doomed = new Set(doomedReadingKeys);
		const result = await ctx.db
			.query("readingEntries")
			.paginate(paginationOpts);
		let patched = 0;
		for (const entry of result.page) {
			const reading = await ctx.db.get(entry.readingId);
			if (!reading || doomed.has(reading.readingKey)) continue;
			const record = optionalRecord(entry.record);
			if (!record) continue;
			const pruned = pruneReadingReferences(record.knowledge, doomed);
			if (!pruned.changed) continue;
			await ctx.db.patch(entry._id, {
				record: { ...record, knowledge: pruned.value },
			});
			patched += 1;
		}
		if (patched > 0) await bumpDictionaryRevision(ctx);
		return {
			continueCursor: result.continueCursor,
			isDone: result.isDone,
			patched,
		};
	},
});

export const pruneAccumulatedKnowledgeRelationsPage = internalMutation({
	args: {
		doomedReadingKeys: v.array(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	returns: mutationPageValidator,
	handler: async (ctx, { doomedReadingKeys, paginationOpts }) => {
		const doomed = new Set(doomedReadingKeys);
		const result = await ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_owner_kind_and_owner_key", (q) =>
				q.eq("ownerKind", "Reading"),
			)
			.paginate(paginationOpts);
		let patched = 0;
		for (const knowledge of result.page) {
			if (doomed.has(knowledge.ownerKey)) continue;
			const pruned = pruneReadingReferences(knowledge.knowledge, doomed);
			if (!pruned.changed) continue;
			await replaceAccumulatedKnowledge(
				ctx,
				"Reading",
				knowledge.ownerKey,
				pruned.value,
			);
			patched += 1;
		}
		if (patched > 0) await bumpDictionaryRevision(ctx);
		return {
			continueCursor: result.continueCursor,
			isDone: result.isDone,
			patched,
		};
	},
});

export const pruneKnowledgeContributionRelationsPage = internalMutation({
	args: {
		doomedReadingKeys: v.array(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	returns: mutationPageValidator,
	handler: async (ctx, { doomedReadingKeys, paginationOpts }) => {
		const doomed = new Set(doomedReadingKeys);
		const result = await ctx.db
			.query("knowledgeContributions")
			.paginate(paginationOpts);
		let patched = 0;
		for (const contribution of result.page) {
			if (
				contribution.ownerKind !== "Reading" ||
				doomed.has(contribution.ownerKey)
			) {
				continue;
			}
			const change = optionalRecord(contribution.change);
			if (
				change?.aspect !== "semanticRelations" ||
				typeof change.relation !== "string" ||
				!Array.isArray(change.value)
			) {
				continue;
			}
			const relation = change.relation;
			const pruned = pruneReadingReferences(
				{ semanticRelations: { [relation]: change.value } },
				doomed,
			);
			if (!pruned.changed) continue;
			const knowledge = optionalRecord(pruned.value);
			const relations = optionalRecord(knowledge?.semanticRelations);
			const targets = relations?.[relation];
			if (!Array.isArray(targets) || targets.length === 0) {
				await ctx.db.delete(contribution._id);
			} else {
				await ctx.db.patch(contribution._id, {
					change: { ...change, value: targets },
				});
			}
			patched += 1;
		}
		if (patched > 0) await bumpDictionaryRevision(ctx);
		return {
			continueCursor: result.continueCursor,
			isDone: result.isDone,
			patched,
		};
	},
});

export const clearReadingDataBatch = internalMutation({
	args: { readingKeys: v.array(v.string()) },
	returns: v.object({ deleted: v.number(), deletedReadings: v.number() }),
	handler: async (ctx, { readingKeys }) => {
		let deleted = 0;
		let deletedReadings = 0;
		for (const readingKey of readingKeys) {
			if (deleted >= BATCH_SIZE) break;
			const pending = await ctx.db
				.query("pendingSemanticRelations")
				.withIndex("by_source_reading_key", (q) =>
					q.eq("sourceReadingKey", readingKey),
				)
				.take(BATCH_SIZE - deleted);
			for (const relation of pending) {
				await ctx.db.delete(relation._id);
				deleted += 1;
			}
			const contributions = await ctx.db
				.query("knowledgeContributions")
				.withIndex("by_owner_kind_and_owner_key", (q) =>
					q.eq("ownerKind", "Reading").eq("ownerKey", readingKey),
				)
				.take(BATCH_SIZE - deleted);
			for (const contribution of contributions) {
				await ctx.db.delete(contribution._id);
				deleted += 1;
			}
			const accumulated = await ctx.db
				.query("accumulatedKnowledge")
				.withIndex("by_owner_kind_and_owner_key", (q) =>
					q.eq("ownerKind", "Reading").eq("ownerKey", readingKey),
				)
				.unique();
			await replaceAccumulatedKnowledge(
				ctx,
				"Reading",
				readingKey,
				undefined,
			);
			if (accumulated) deleted += 1;
			const reading = await ctx.db
				.query("readings")
				.withIndex("by_reading_key", (q) =>
					q.eq("readingKey", readingKey),
				)
				.unique();
			if (!reading) continue;
			const entry = await ctx.db
				.query("readingEntries")
				.withIndex("by_reading_id", (q) =>
					q.eq("readingId", reading._id),
				)
				.unique();
			if (entry) {
				await ctx.db.delete(entry._id);
				deleted += 1;
			}
			await ctx.db.delete(reading._id);
			deleted += 1;
			deletedReadings += 1;
		}
		if (deleted > 0) await bumpDictionaryRevision(ctx);
		return { deleted, deletedReadings };
	},
});

export const clearLemmaDataBatch = internalMutation({
	args: { lemmaIds: v.array(v.id("lemmas")) },
	returns: v.object({ deleted: v.number(), deletedLemmas: v.number() }),
	handler: async (ctx, { lemmaIds }) => {
		let deleted = 0;
		let deletedLemmas = 0;
		for (const lemmaId of lemmaIds) {
			if (deleted >= BATCH_SIZE) break;
			const lemma = await ctx.db.get(lemmaId);
			if (!lemma) continue;
			const reading = await ctx.db
				.query("readings")
				.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemmaId))
				.first();
			if (reading) continue;

			const surfaces = await ctx.db
				.query("surfaces")
				.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemmaId))
				.take(BATCH_SIZE - deleted);
			for (const surface of surfaces) {
				const attestation = await ctx.db
					.query("attestations")
					.withIndex("by_surface_id", (q) =>
						q.eq("surfaceId", surface._id),
					)
					.first();
				if (attestation) continue;
				const entry = await ctx.db
					.query("ownedSurfaces")
					.withIndex("by_surface_id", (q) =>
						q.eq("surfaceId", surface._id),
					)
					.unique();
				if (entry) {
					await ctx.db.delete(entry._id);
					deleted += 1;
				}
				await ctx.db.delete(surface._id);
				deleted += 1;
			}
			const survivingSurface = await ctx.db
				.query("surfaces")
				.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemmaId))
				.first();
			if (survivingSurface) continue;

			const contributions = await ctx.db
				.query("knowledgeContributions")
				.withIndex("by_owner_kind_and_owner_key", (q) =>
					q.eq("ownerKind", "Lemma").eq("ownerKey", lemma.lemmaKey),
				)
				.take(BATCH_SIZE - deleted);
			for (const contribution of contributions) {
				await ctx.db.delete(contribution._id);
				deleted += 1;
			}
			const accumulated = await ctx.db
				.query("accumulatedKnowledge")
				.withIndex("by_owner_kind_and_owner_key", (q) =>
					q.eq("ownerKind", "Lemma").eq("ownerKey", lemma.lemmaKey),
				)
				.unique();
			if (accumulated) {
				await ctx.db.delete(accumulated._id);
				deleted += 1;
			}
			const dictionaryLemma = await ctx.db
				.query("dictionaryLemmas")
				.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemmaId))
				.unique();
			if (dictionaryLemma) {
				await ctx.db.delete(dictionaryLemma._id);
				deleted += 1;
			}
			await ctx.db.delete(lemmaId);
			deleted += 1;
			deletedLemmas += 1;
		}
		if (deleted > 0) await bumpDictionaryRevision(ctx);
		return { deleted, deletedLemmas };
	},
});

export const resetDemoData = internalAction({
	args: {},
	returns: v.object({ deleted: v.number() }),
	handler: async (ctx): Promise<{ deleted: number }> => {
		let deleted = 0;
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result = await ctx.runMutation(
				internal.demoReset.resetDemoDataBatch,
				{},
			);
			deleted += result.deleted;
			if (!result.hasMore) return { deleted };
		}
		throw new Error("Demo reset exceeded its batch limit.");
	},
});

export const clearSharedData = action({
	args: {},
	returns: v.object({ deleted: v.number() }),
	handler: async (ctx): Promise<{ deleted: number }> => {
		let deleted = 0;
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result = await ctx.runMutation(
				internal.demoReset.clearSharedDataBatch,
				{},
			);
			deleted += result.deleted;
			if (!result.hasMore) return { deleted };
		}
		throw new Error("Shared-data reset exceeded its batch limit.");
	},
});

export const stripTextAnalysis = action({
	args: { textId: v.id("texts") },
	returns: v.object({
		removed: v.number(),
		deletedReadings: v.number(),
		deletedLemmas: v.number(),
	}),
	handler: async (ctx, { textId }) => {
		const candidates = await ctx.runQuery(
			internal.demoReset.getTextAnalysisCandidates,
			{ textId },
		);
		if (!candidates) {
			return { removed: 0, deletedReadings: 0, deletedLemmas: 0 };
		}
		let removed = 0;
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result = await ctx.runMutation(
				internal.demoReset.stripTextAnalysisGraphBatch,
				{ textId },
			);
			removed += result.deleted;
			if (!result.hasMore) break;
			if (batch === MAX_BATCHES - 1) {
				throw new Error(
					"Analysis stripping exceeded its graph batch limit.",
				);
			}
		}

		const descriptors = [];
		for (
			let offset = 0;
			offset < candidates.readingIds.length;
			offset += DESCRIPTOR_PAGE_SIZE
		) {
			descriptors.push(
				...(await ctx.runQuery(
					internal.demoReset.describeReadingCleanupCandidates,
					{
						readingIds: candidates.readingIds.slice(
							offset,
							offset + DESCRIPTOR_PAGE_SIZE,
						),
					},
				)),
			);
		}
		const doomed = descriptors.filter(({ hasRemainingSource }) =>
			Boolean(!hasRemainingSource),
		);
		const doomedReadingKeys = doomed.map(({ readingKey }) => readingKey);
		for (const functionReference of [
			internal.demoReset.pruneReadingEntryRelationsPage,
			internal.demoReset.pruneAccumulatedKnowledgeRelationsPage,
			internal.demoReset.pruneKnowledgeContributionRelationsPage,
		]) {
			let cursor: string | null = null;
			for (let page = 0; page < MAX_PAGES; page += 1) {
				const result: {
					continueCursor: string;
					isDone: boolean;
					patched: number;
				} = await ctx.runMutation(functionReference, {
					doomedReadingKeys,
					paginationOpts: { cursor, numItems: PAGE_SIZE },
				});
				if (result.isDone) break;
				cursor = result.continueCursor;
				if (page === MAX_PAGES - 1) {
					throw new Error(
						"Relation pruning exceeded its page limit.",
					);
				}
			}
		}

		let deletedReadings = 0;
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result = await ctx.runMutation(
				internal.demoReset.clearReadingDataBatch,
				{ readingKeys: doomedReadingKeys },
			);
			removed += result.deleted;
			deletedReadings += result.deletedReadings;
			if (result.deleted === 0) break;
		}

		const lemmaIds = [...new Set(doomed.map(({ lemmaId }) => lemmaId))];
		let deletedLemmas = 0;
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result = await ctx.runMutation(
				internal.demoReset.clearLemmaDataBatch,
				{ lemmaIds },
			);
			removed += result.deleted;
			deletedLemmas += result.deletedLemmas;
			if (result.deleted === 0) break;
		}
		return { removed, deletedReadings, deletedLemmas };
	},
});

export const clearVisitorData = action({
	args: { visitorId: v.string() },
	returns: v.object({ deleted: v.number() }),
	handler: async (ctx, { visitorId }): Promise<{ deleted: number }> => {
		assertVisitorId(visitorId);
		let deleted = 0;
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result = await ctx.runMutation(
				internal.demoReset.clearVisitorDataBatch,
				{ visitorId },
			);
			deleted += result.deleted;
			if (!result.hasMore) return { deleted };
		}
		throw new Error("Visitor-data reset exceeded its batch limit.");
	},
});
