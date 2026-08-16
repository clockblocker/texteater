import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import {
	attestationIdentityKey,
	parseAttestationIdentityKey,
} from "../server/attestationIdentity";
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

const BATCH_SIZE = 400;
const MAX_BATCHES = 100;
const MAX_PAGES = 1_000;
const MAX_SENTENCES_PER_TEXT = 9;
const MAX_CONTEXTS_PER_SENTENCE = 512;
const MAX_READING_CANDIDATES = 5_000;
const MAX_ATTESTATIONS_PER_READING = 50;
const PAGE_SIZE = 100;
const DESCRIPTOR_PAGE_SIZE = 20;

const sharedTableNames = [
	"knowledgeContributions",
	"accumulatedKnowledge",
	"pendingSemanticRelations",
	"ownedSurfaces",
	"readings",
	"dictionaryLemmas",
	"resolvedContexts",
	"grammaticalResolutions",
	"segments",
	"sentences",
	"texts",
	"dictionaryState",
] as const;

const demoTableNames = [
	"visitorResolvedContexts",
	"visitorClicks",
	...sharedTableNames,
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

function stringValues(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((member): member is string => typeof member === "string")
		: [];
}

async function bumpDictionaryRevision(ctx: MutationCtx): Promise<void> {
	const state = await ctx.db
		.query("dictionaryState")
		.withIndex("by_key", (q) => q.eq("key", "global"))
		.unique();
	if (state) {
		await ctx.db.patch(state._id, { revision: state.revision + 1 });
	} else {
		await ctx.db.insert("dictionaryState", { key: "global", revision: 1 });
	}
}

export const clearSharedDataBatch = internalMutation({
	args: {},
	returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
	handler: async (ctx) => {
		let deleted = 0;
		let hasMore = false;
		for (const tableName of sharedTableNames) {
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
		const contexts = await ctx.db
			.query("visitorResolvedContexts")
			.withIndex("by_visitor_id_and_resolved_at", (q) =>
				q.eq("visitorId", visitorId),
			)
			.take(BATCH_SIZE);
		for (const context of contexts) await ctx.db.delete(context._id);

		const clicks = await ctx.db
			.query("visitorClicks")
			.withIndex("by_visitor_id_and_clicked_at", (q) =>
				q.eq("visitorId", visitorId),
			)
			.take(BATCH_SIZE);
		for (const click of clicks) await ctx.db.delete(click._id);

		return {
			deleted: contexts.length + clicks.length,
			hasMore:
				contexts.length === BATCH_SIZE || clicks.length === BATCH_SIZE,
		};
	},
});

export const resetDemoDataBatch = internalMutation({
	args: {},
	returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
	handler: async (ctx) => {
		let deleted = 0;
		let hasMore = false;
		for (const tableName of demoTableNames) {
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
	attestationKeys: v.array(v.string()),
	legacyAttestations: v.array(v.string()),
});

const readingDescriptorValidator = v.object({
	readingId: v.id("readings"),
	readingKey: v.string(),
	lemmaKey: v.string(),
	hasRemainingSource: v.boolean(),
});

const deletionPageValidator = v.object({
	continueCursor: v.string(),
	isDone: v.boolean(),
	matchedReadingIds: v.array(v.id("readings")),
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

		const readingIds = new Set<Id<"readings">>();
		for (const sentence of sentences) {
			const [contexts, legacyContexts] = await Promise.all([
				ctx.db
					.query("resolvedContexts")
					.withIndex(
						"by_sentence_id_and_clicked_segment_index",
						(q) => q.eq("sentenceId", sentence._id),
					)
					.take(MAX_CONTEXTS_PER_SENTENCE + 1),
				ctx.db
					.query("visitorResolvedContexts")
					.withIndex(
						"by_sentence_id_and_clicked_segment_index",
						(q) => q.eq("sentenceId", sentence._id),
					)
					.take(MAX_CONTEXTS_PER_SENTENCE + 1),
			]);
			if (
				contexts.length > MAX_CONTEXTS_PER_SENTENCE ||
				legacyContexts.length > MAX_CONTEXTS_PER_SENTENCE
			) {
				throw new Error(
					`Analysis stripping exceeded ${MAX_CONTEXTS_PER_SENTENCE} resolution contexts for one Sentence.`,
				);
			}
			for (const context of contexts) readingIds.add(context.readingId);
			for (const context of legacyContexts) {
				if (context.readingId) readingIds.add(context.readingId);
			}
		}

		return {
			readingIds: [...readingIds],
			attestationKeys: sentences.map((sentence) =>
				attestationIdentityKey({
					sentenceId: sentence._id,
					textId,
				}),
			),
			legacyAttestations: [
				...new Set(sentences.map(({ stitchedText }) => stitchedText)),
			],
		};
	},
});

export const findReadingsByAttestationPage = internalQuery({
	args: {
		attestations: v.array(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	returns: deletionPageValidator,
	handler: async (ctx, { attestations, paginationOpts }) => {
		const targetAttestations = new Set(attestations);
		const result = await ctx.db.query("readings").paginate(paginationOpts);
		return {
			continueCursor: result.continueCursor,
			isDone: result.isDone,
			matchedReadingIds: result.page.flatMap((reading) => {
				const entry = optionalRecord(reading.entry);
				return stringValues(entry?.attestations).some((attestation) =>
					targetAttestations.has(attestation),
				)
					? [reading._id]
					: [];
			}),
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
			const legacyVisitorContexts = await ctx.db
				.query("visitorResolvedContexts")
				.withIndex("by_sentence_id_and_clicked_segment_index", (q) =>
					q.eq("sentenceId", sentence._id),
				)
				.take(BATCH_SIZE);
			if (legacyVisitorContexts.length > 0) {
				for (const context of legacyVisitorContexts) {
					await ctx.db.delete(context._id);
				}
				return { deleted: legacyVisitorContexts.length, hasMore: true };
			}

			const clicks = await ctx.db
				.query("visitorClicks")
				.withIndex("by_sentence_id", (q) =>
					q.eq("sentenceId", sentence._id),
				)
				.take(Math.floor(BATCH_SIZE / 2));
			if (clicks.length > 0) {
				let deleted = 0;
				for (const click of clicks) {
					const visitorContext = await ctx.db
						.query("visitorResolvedContexts")
						.withIndex("by_click_id", (q) =>
							q.eq("clickId", click._id),
						)
						.unique();
					if (visitorContext) {
						await ctx.db.delete(visitorContext._id);
						deleted += 1;
					}
					await ctx.db.delete(click._id);
					deleted += 1;
				}
				return { deleted, hasMore: true };
			}

			const resolvedContext = await ctx.db
				.query("resolvedContexts")
				.withIndex("by_sentence_id_and_clicked_segment_index", (q) =>
					q.eq("sentenceId", sentence._id),
				)
				.first();
			if (resolvedContext) {
				const visitorContexts = await ctx.db
					.query("visitorResolvedContexts")
					.withIndex("by_resolved_context_id", (q) =>
						q.eq("resolvedContextId", resolvedContext._id),
					)
					.take(BATCH_SIZE);
				if (visitorContexts.length > 0) {
					for (const context of visitorContexts) {
						await ctx.db.delete(context._id);
					}
					return { deleted: visitorContexts.length, hasMore: true };
				}
				await ctx.db.delete(resolvedContext._id);
				return { deleted: 1, hasMore: true };
			}

			const resolutions = await ctx.db
				.query("grammaticalResolutions")
				.withIndex("by_sentence_id", (q) =>
					q.eq("sentenceId", sentence._id),
				)
				.take(BATCH_SIZE);
			if (resolutions.length > 0) {
				for (const resolution of resolutions) {
					await ctx.db.delete(resolution._id);
				}
				return { deleted: resolutions.length, hasMore: true };
			}

			const segments = await ctx.db
				.query("segments")
				.withIndex("by_sentence_id_and_index", (q) =>
					q.eq("sentenceId", sentence._id),
				)
				.take(BATCH_SIZE);
			if (segments.length > 0) {
				for (const segment of segments)
					await ctx.db.delete(segment._id);
				return { deleted: segments.length, hasMore: true };
			}
		}

		return { deleted: 0, hasMore: false };
	},
});

export const describeReadingCleanupCandidates = internalQuery({
	args: {
		readingIds: v.array(v.id("readings")),
		strippedAttestations: v.array(v.string()),
	},
	returns: v.array(readingDescriptorValidator),
	handler: async (ctx, { readingIds, strippedAttestations }) => {
		if (readingIds.length > DESCRIPTOR_PAGE_SIZE) {
			throw new Error(
				`Describe at most ${DESCRIPTOR_PAGE_SIZE} Readings per call.`,
			);
		}
		const stripped = new Set(strippedAttestations);
		const descriptors = [];
		for (const readingId of readingIds) {
			const reading = await ctx.db.get(readingId);
			if (!reading) continue;
			const entry = optionalRecord(reading.entry);
			const attestations = stringValues(entry?.attestations);
			if (attestations.length > MAX_ATTESTATIONS_PER_READING) {
				throw new Error(
					`Reading ${reading.readingKey} exceeds ${MAX_ATTESTATIONS_PER_READING} attestations.`,
				);
			}
			const [context, legacyContext] = await Promise.all([
				ctx.db
					.query("resolvedContexts")
					.withIndex("by_reading_id", (q) =>
						q.eq("readingId", readingId),
					)
					.first(),
				ctx.db
					.query("visitorResolvedContexts")
					.withIndex("by_reading_id", (q) =>
						q.eq("readingId", readingId),
					)
					.first(),
			]);
			let hasRemainingAttestation = false;
			if (!context && !legacyContext) {
				for (const attestation of attestations) {
					if (stripped.has(attestation)) continue;
					const identity = parseAttestationIdentityKey(attestation);
					const sentence = identity
						? await ctx.db.get(
								identity.sentenceId as Id<"sentences">,
							)
						: await ctx.db
								.query("sentences")
								.withIndex("by_stitched_text", (q) =>
									q.eq("stitchedText", attestation),
								)
								.first();
					if (
						sentence &&
						(!identity || sentence.textId === identity.textId)
					) {
						hasRemainingAttestation = true;
						break;
					}
				}
			}
			descriptors.push({
				readingId,
				readingKey: reading.readingKey,
				lemmaKey: reading.lemmaKey,
				hasRemainingSource: Boolean(
					context || legacyContext || hasRemainingAttestation,
				),
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
		const result = await ctx.db.query("readings").paginate(paginationOpts);
		let patched = 0;
		for (const reading of result.page) {
			if (doomed.has(reading.readingKey)) continue;
			const entry = optionalRecord(reading.entry);
			if (!entry) continue;
			const pruned = pruneReadingReferences(entry.knowledge, doomed);
			if (!pruned.changed) continue;
			await ctx.db.patch(reading._id, {
				entry: { ...entry, knowledge: pruned.value },
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
			await ctx.db.patch(knowledge._id, { knowledge: pruned.value });
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
			const semanticRelations = optionalRecord(
				knowledge?.semanticRelations,
			);
			const targets = semanticRelations?.[relation];
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
			if (deleted >= BATCH_SIZE) break;

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
			if (deleted >= BATCH_SIZE) break;

			const accumulated = await ctx.db
				.query("accumulatedKnowledge")
				.withIndex("by_owner_kind_and_owner_key", (q) =>
					q.eq("ownerKind", "Reading").eq("ownerKey", readingKey),
				)
				.unique();
			if (accumulated) {
				await ctx.db.delete(accumulated._id);
				deleted += 1;
			}
			if (deleted >= BATCH_SIZE) break;

			const reading = await ctx.db
				.query("readings")
				.withIndex("by_reading_key", (q) =>
					q.eq("readingKey", readingKey),
				)
				.unique();
			if (reading) {
				await ctx.db.delete(reading._id);
				deleted += 1;
				deletedReadings += 1;
			}
		}
		if (deleted > 0) await bumpDictionaryRevision(ctx);
		return { deleted, deletedReadings };
	},
});

export const clearLemmaDataBatch = internalMutation({
	args: { lemmaKeys: v.array(v.string()) },
	returns: v.object({ deleted: v.number(), deletedLemmas: v.number() }),
	handler: async (ctx, { lemmaKeys }) => {
		let deleted = 0;
		let deletedLemmas = 0;
		for (const lemmaKey of lemmaKeys) {
			if (deleted >= BATCH_SIZE) break;
			const [reading, resolution] = await Promise.all([
				ctx.db
					.query("readings")
					.withIndex("by_lemma_key", (q) =>
						q.eq("lemmaKey", lemmaKey),
					)
					.first(),
				ctx.db
					.query("grammaticalResolutions")
					.withIndex("by_lemma_key", (q) =>
						q.eq("lemmaKey", lemmaKey),
					)
					.first(),
			]);
			if (reading || resolution) continue;

			const surfaces = await ctx.db
				.query("ownedSurfaces")
				.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", lemmaKey))
				.take(BATCH_SIZE - deleted);
			for (const surface of surfaces) {
				await ctx.db.delete(surface._id);
				deleted += 1;
			}
			if (deleted >= BATCH_SIZE) break;

			const contributions = await ctx.db
				.query("knowledgeContributions")
				.withIndex("by_owner_kind_and_owner_key", (q) =>
					q.eq("ownerKind", "Lemma").eq("ownerKey", lemmaKey),
				)
				.take(BATCH_SIZE - deleted);
			for (const contribution of contributions) {
				await ctx.db.delete(contribution._id);
				deleted += 1;
			}
			if (deleted >= BATCH_SIZE) break;

			const accumulated = await ctx.db
				.query("accumulatedKnowledge")
				.withIndex("by_owner_kind_and_owner_key", (q) =>
					q.eq("ownerKind", "Lemma").eq("ownerKey", lemmaKey),
				)
				.unique();
			if (accumulated) {
				await ctx.db.delete(accumulated._id);
				deleted += 1;
			}

			const lemma = await ctx.db
				.query("dictionaryLemmas")
				.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", lemmaKey))
				.unique();
			if (lemma) {
				await ctx.db.delete(lemma._id);
				deleted += 1;
				deletedLemmas += 1;
			}
		}
		if (deleted > 0) await bumpDictionaryRevision(ctx);
		return { deleted, deletedLemmas };
	},
});

export const removeStrippedReadingAttestationsBatch = internalMutation({
	args: {
		readingIds: v.array(v.id("readings")),
		attestations: v.array(v.string()),
	},
	returns: v.object({ patched: v.number() }),
	handler: async (ctx, { readingIds, attestations }) => {
		if (readingIds.length > PAGE_SIZE) {
			throw new Error(`Patch at most ${PAGE_SIZE} Readings per call.`);
		}
		const removed = new Set(attestations);
		let patched = 0;
		for (const readingId of readingIds) {
			const reading = await ctx.db.get(readingId);
			if (!reading) continue;
			const entry = optionalRecord(reading.entry);
			if (!entry) continue;
			const current = stringValues(entry.attestations);
			const next = current.filter((value) => !removed.has(value));
			if (next.length === current.length) continue;
			await ctx.db.patch(readingId, {
				entry: { ...entry, attestations: next },
			});
			patched += 1;
		}
		if (patched > 0) await bumpDictionaryRevision(ctx);
		return { patched };
	},
});

export const removeSurfaceAttestationsPage = internalMutation({
	args: {
		lemmaKey: v.string(),
		attestations: v.array(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	returns: mutationPageValidator,
	handler: async (ctx, { lemmaKey, attestations, paginationOpts }) => {
		const removed = new Set(attestations);
		const result = await ctx.db
			.query("ownedSurfaces")
			.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", lemmaKey))
			.paginate(paginationOpts);
		let patched = 0;
		for (const surface of result.page) {
			const entry = optionalRecord(surface.entry);
			if (!entry) continue;
			const current = stringValues(entry.attestations);
			const next = current.filter((value) => !removed.has(value));
			if (next.length === current.length) continue;
			await ctx.db.patch(surface._id, {
				entry: { ...entry, attestations: next },
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

/**
 * The single explicit destructive demo operation.
 *
 * This remains internal because the app has no authentication foundation. Run
 * it deliberately with `convex run demoReset:resetDemoData`.
 */
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
		throw new Error(
			`Demo reset exceeded ${MAX_BATCHES} bounded batches after deleting ${deleted} documents.`,
		);
	},
});

/** Local-demo control: clears global linguistic and Knowledge data. */
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
		throw new Error(
			`Shared-data reset exceeded ${MAX_BATCHES} bounded batches after deleting ${deleted} documents.`,
		);
	},
});

/** Local-demo control: strips one Text's analysis while preserving its source Sentences. */
export const stripTextAnalysis = action({
	args: { textId: v.id("texts") },
	returns: v.object({
		removed: v.number(),
		deletedReadings: v.number(),
		deletedLemmas: v.number(),
	}),
	handler: async (
		ctx,
		{ textId },
	): Promise<{
		removed: number;
		deletedReadings: number;
		deletedLemmas: number;
	}> => {
		const candidates = await ctx.runQuery(
			internal.demoReset.getTextAnalysisCandidates,
			{ textId },
		);
		if (!candidates) {
			return { removed: 0, deletedReadings: 0, deletedLemmas: 0 };
		}

		const candidateReadingIds = new Set<Id<"readings">>(
			candidates.readingIds,
		);
		const candidateAttestations = [
			...candidates.attestationKeys,
			...candidates.legacyAttestations,
		];
		let cursor: string | null = null;
		let readingScanFinished = false;
		for (let page = 0; page < MAX_PAGES; page += 1) {
			const result: {
				continueCursor: string;
				isDone: boolean;
				matchedReadingIds: Id<"readings">[];
			} = await ctx.runQuery(
				internal.demoReset.findReadingsByAttestationPage,
				{
					attestations: candidateAttestations,
					paginationOpts: { cursor, numItems: PAGE_SIZE },
				},
			);
			for (const readingId of result.matchedReadingIds) {
				candidateReadingIds.add(readingId);
			}
			if (candidateReadingIds.size > MAX_READING_CANDIDATES) {
				throw new Error(
					`Analysis stripping exceeded ${MAX_READING_CANDIDATES} candidate Readings.`,
				);
			}
			if (result.isDone) {
				readingScanFinished = true;
				break;
			}
			cursor = result.continueCursor;
		}
		if (!readingScanFinished) {
			throw new Error(
				`Analysis stripping exceeded ${MAX_PAGES} Reading scan pages.`,
			);
		}

		let removed = 0;
		let graphStripped = false;
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result = await ctx.runMutation(
				internal.demoReset.stripTextAnalysisGraphBatch,
				{ textId },
			);
			removed += result.deleted;
			if (!result.hasMore) {
				graphStripped = true;
				break;
			}
		}
		if (!graphStripped) {
			throw new Error(
				`Analysis stripping exceeded ${MAX_BATCHES} graph batches after removing ${removed} documents.`,
			);
		}
		const attestationsToRemove = candidateAttestations;

		const descriptors: Array<{
			readingId: Id<"readings">;
			readingKey: string;
			lemmaKey: string;
			hasRemainingSource: boolean;
		}> = [];
		const candidateIds = [...candidateReadingIds];
		for (
			let offset = 0;
			offset < candidateIds.length;
			offset += DESCRIPTOR_PAGE_SIZE
		) {
			descriptors.push(
				...(await ctx.runQuery(
					internal.demoReset.describeReadingCleanupCandidates,
					{
						readingIds: candidateIds.slice(
							offset,
							offset + DESCRIPTOR_PAGE_SIZE,
						),
						strippedAttestations: attestationsToRemove,
					},
				)),
			);
		}
		const doomed = descriptors.filter(({ hasRemainingSource }) =>
			Boolean(!hasRemainingSource),
		);
		const doomedReadingKeys = doomed.map(({ readingKey }) => readingKey);
		const doomedLemmaKeys = [
			...new Set(doomed.map(({ lemmaKey }) => lemmaKey)),
		];

		if (doomedReadingKeys.length > 0) {
			for (const functionReference of [
				internal.demoReset.pruneReadingEntryRelationsPage,
				internal.demoReset.pruneAccumulatedKnowledgeRelationsPage,
				internal.demoReset.pruneKnowledgeContributionRelationsPage,
			]) {
				let pruneCursor: string | null = null;
				let pruningFinished = false;
				for (let page = 0; page < MAX_PAGES; page += 1) {
					const result: {
						continueCursor: string;
						isDone: boolean;
						patched: number;
					} = await ctx.runMutation(functionReference, {
						doomedReadingKeys,
						paginationOpts: {
							cursor: pruneCursor,
							numItems: PAGE_SIZE,
						},
					});
					if (result.isDone) {
						pruningFinished = true;
						break;
					}
					pruneCursor = result.continueCursor;
				}
				if (!pruningFinished) {
					throw new Error(
						`Analysis stripping exceeded ${MAX_PAGES} relation-pruning pages.`,
					);
				}
			}
		}

		let deletedReadings = 0;
		let readingCleanupFinished = doomedReadingKeys.length === 0;
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			if (readingCleanupFinished) break;
			const result = await ctx.runMutation(
				internal.demoReset.clearReadingDataBatch,
				{ readingKeys: doomedReadingKeys },
			);
			removed += result.deleted;
			deletedReadings += result.deletedReadings;
			if (result.deleted === 0) readingCleanupFinished = true;
		}
		if (!readingCleanupFinished) {
			throw new Error(
				`Analysis stripping exceeded ${MAX_BATCHES} Reading cleanup batches.`,
			);
		}

		let deletedLemmas = 0;
		let lemmaCleanupFinished = doomedLemmaKeys.length === 0;
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			if (lemmaCleanupFinished) break;
			const result = await ctx.runMutation(
				internal.demoReset.clearLemmaDataBatch,
				{ lemmaKeys: doomedLemmaKeys },
			);
			removed += result.deleted;
			deletedLemmas += result.deletedLemmas;
			if (result.deleted === 0) lemmaCleanupFinished = true;
		}
		if (!lemmaCleanupFinished) {
			throw new Error(
				`Analysis stripping exceeded ${MAX_BATCHES} Lemma cleanup batches.`,
			);
		}

		const surviving = descriptors.filter(({ hasRemainingSource }) =>
			Boolean(hasRemainingSource),
		);
		for (let offset = 0; offset < surviving.length; offset += PAGE_SIZE) {
			await ctx.runMutation(
				internal.demoReset.removeStrippedReadingAttestationsBatch,
				{
					readingIds: surviving
						.slice(offset, offset + PAGE_SIZE)
						.map(({ readingId }) => readingId),
					attestations: attestationsToRemove,
				},
			);
		}
		for (const lemmaKey of new Set(
			surviving.map((descriptor) => descriptor.lemmaKey),
		)) {
			let surfaceCursor: string | null = null;
			let surfaceCleanupFinished = false;
			for (let page = 0; page < MAX_PAGES; page += 1) {
				const result: {
					continueCursor: string;
					isDone: boolean;
					patched: number;
				} = await ctx.runMutation(
					internal.demoReset.removeSurfaceAttestationsPage,
					{
						lemmaKey,
						attestations: attestationsToRemove,
						paginationOpts: {
							cursor: surfaceCursor,
							numItems: PAGE_SIZE,
						},
					},
				);
				if (result.isDone) {
					surfaceCleanupFinished = true;
					break;
				}
				surfaceCursor = result.continueCursor;
			}
			if (!surfaceCleanupFinished) {
				throw new Error(
					`Analysis stripping exceeded ${MAX_PAGES} Surface cleanup pages.`,
				);
			}
		}
		return { removed, deletedReadings, deletedLemmas };
	},
});

/**
 * Local-demo control: clears only rows scoped to the anonymous visitor ID.
 * The app deliberately has no authentication foundation and is not a hosted
 * multi-user surface.
 */
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
		throw new Error(
			`Visitor-data reset exceeded ${MAX_BATCHES} bounded batches after deleting ${deleted} documents.`,
		);
	},
});
