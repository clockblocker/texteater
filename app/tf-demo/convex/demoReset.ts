import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id, TableNames } from "./_generated/dataModel";
import {
	action,
	internalAction,
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "./_generated/server";
import { finishSegmentResolution } from "./model/segmentResolutionState";

const BATCH_SIZE = 400;
const CLEANUP_DELETE_BUDGET = BATCH_SIZE - 1;
const MAX_BATCHES = 1_000;
const MAX_CLEANUP_PHASE_STEPS = 64;
const MAX_SENTENCES_PER_TEXT = 9;
const MAX_SEGMENTS_PER_SENTENCE = 512;
const DESCRIPTOR_PAGE_SIZE = 20;

/** Every application-owned tf-demo table removed by the bounded full reset. */
export const resetDemoTableNames = [
	"resolutionSessions",
	"resolutionRuns",
	"catalogGrowthSignals",
	"generatedRelationProposals",
	"generatedRelationRuns",
	"knowledgeGenerationAttempts",
	"relationPublicationControls",
	"knowledgeSettings",
	"readingLanguageLayouts",
	"readingFamilyKindLayouts",
	"structuralShadowReferences",
	"knowledgeChanges",
	"accumulatedKnowledge",
	"pendingSemanticRelations",
	"shadows",
	"attestations",
	"visitorClicks",
	"ownedSurfaces",
	"readingEntries",
	"grammaticalRelationEdges",
	"semanticRelationEdges",
	"readings",
	"dictionaryLemmas",
	"surfaces",
	"lemmas",
	"segments",
	"sentences",
	"texts",
	"dictionaryState",
] as const satisfies readonly TableNames[];

function assertVisitorId(visitorId: string): void {
	if (visitorId.trim().length === 0 || visitorId.length > 200) {
		throw new Error("visitorId must contain 1 to 200 characters.");
	}
}

async function bumpDictionaryRevision(ctx: MutationCtx): Promise<void> {
	const state = await ctx.db
		.query("dictionaryState")
		.withIndex("by_key", (q) => q.eq("key", "global"))
		.unique();
	if (state) await ctx.db.patch(state._id, { revision: state.revision + 1 });
	else await ctx.db.insert("dictionaryState", { key: "global", revision: 1 });
}

const tableResetResultValidator = v.object({
	deleted: v.number(),
	hasMore: v.boolean(),
	nextTableIndex: v.number(),
});

async function clearTableBatch(
	ctx: MutationCtx,
	tableIndexValue: number | undefined,
) {
	const tableIndex = tableIndexValue ?? 0;
	if (
		!Number.isSafeInteger(tableIndex) ||
		tableIndex < 0 ||
		tableIndex > resetDemoTableNames.length
	) {
		throw new Error("Reset table index is invalid.");
	}
	if (tableIndex === resetDemoTableNames.length) {
		return { deleted: 0, hasMore: false, nextTableIndex: tableIndex };
	}
	const tableName = resetDemoTableNames[tableIndex];
	if (!tableName) throw new Error("Reset table index is invalid.");
	const documents = await ctx.db.query(tableName).take(BATCH_SIZE);
	for (const document of documents) await ctx.db.delete(document._id);
	const nextTableIndex =
		documents.length === BATCH_SIZE ? tableIndex : tableIndex + 1;
	return {
		deleted: documents.length,
		hasMore: nextTableIndex < resetDemoTableNames.length,
		nextTableIndex,
	};
}

export const clearSharedDataBatch = internalMutation({
	args: { tableIndex: v.optional(v.number()) },
	returns: tableResetResultValidator,
	handler: (ctx, { tableIndex }) => clearTableBatch(ctx, tableIndex),
});

const visitorResetPhaseValidator = v.union(
	v.literal("ResolutionSessions"),
	v.literal("GenerationAttempts"),
	v.literal("KnowledgeSettings"),
	v.literal("ReadingLanguageLayouts"),
	v.literal("ReadingFamilyKindLayouts"),
	v.literal("VisitorClicks"),
	v.literal("Done"),
);

type VisitorResetPhase =
	| "ResolutionSessions"
	| "GenerationAttempts"
	| "KnowledgeSettings"
	| "ReadingLanguageLayouts"
	| "ReadingFamilyKindLayouts"
	| "VisitorClicks"
	| "Done";

const visitorResetResultValidator = v.object({
	deleted: v.number(),
	hasMore: v.boolean(),
	nextPhase: visitorResetPhaseValidator,
});

export const clearVisitorDataBatch = internalMutation({
	args: {
		visitorId: v.string(),
		phase: v.optional(visitorResetPhaseValidator),
	},
	returns: visitorResetResultValidator,
	handler: async (ctx, { visitorId, phase: phaseValue }) => {
		assertVisitorId(visitorId);
		const phase: VisitorResetPhase = phaseValue ?? "ResolutionSessions";
		let deleted = 0;
		let nextPhase: VisitorResetPhase;
		switch (phase) {
			case "ResolutionSessions": {
				const rows = await ctx.db
					.query("resolutionSessions")
					.withIndex("by_visitor_id_and_updated_at", (q) =>
						q.eq("visitorId", visitorId),
					)
					.take(BATCH_SIZE);
				for (const row of rows) {
					if (row.lifecycle?.state === "Active") {
						await finishSegmentResolution(
							ctx,
							row.segmentId,
							"PermanentFailure",
						);
					}
					await ctx.db.delete(row._id);
				}
				deleted = rows.length;
				nextPhase =
					rows.length === BATCH_SIZE
						? "ResolutionSessions"
						: "GenerationAttempts";
				break;
			}
			case "GenerationAttempts": {
				const rows = await ctx.db
					.query("knowledgeGenerationAttempts")
					.withIndex("by_visitor_id_and_updated_at", (q) =>
						q.eq("visitorId", visitorId),
					)
					.take(BATCH_SIZE);
				for (const row of rows) await ctx.db.delete(row._id);
				deleted = rows.length;
				nextPhase =
					rows.length === BATCH_SIZE
						? "GenerationAttempts"
						: "KnowledgeSettings";
				break;
			}
			case "KnowledgeSettings": {
				const row = await ctx.db
					.query("knowledgeSettings")
					.withIndex("by_visitor_id", (q) =>
						q.eq("visitorId", visitorId),
					)
					.unique();
				if (row) {
					await ctx.db.delete(row._id);
					deleted = 1;
				}
				nextPhase = "ReadingLanguageLayouts";
				break;
			}
			case "ReadingLanguageLayouts": {
				const rows = await ctx.db
					.query("readingLanguageLayouts")
					.withIndex("by_visitor_id_and_target_language", (q) =>
						q.eq("visitorId", visitorId),
					)
					.take(BATCH_SIZE);
				for (const row of rows) await ctx.db.delete(row._id);
				deleted = rows.length;
				nextPhase =
					rows.length === BATCH_SIZE
						? "ReadingLanguageLayouts"
						: "ReadingFamilyKindLayouts";
				break;
			}
			case "ReadingFamilyKindLayouts": {
				const rows = await ctx.db
					.query("readingFamilyKindLayouts")
					.withIndex(
						"by_visitor_id_and_target_language_and_family_and_kind",
						(q) => q.eq("visitorId", visitorId),
					)
					.take(BATCH_SIZE);
				for (const row of rows) await ctx.db.delete(row._id);
				deleted = rows.length;
				nextPhase =
					rows.length === BATCH_SIZE
						? "ReadingFamilyKindLayouts"
						: "VisitorClicks";
				break;
			}
			case "VisitorClicks": {
				const rows = await ctx.db
					.query("visitorClicks")
					.withIndex("by_visitor_id_and_clicked_at", (q) =>
						q.eq("visitorId", visitorId),
					)
					.take(BATCH_SIZE);
				for (const row of rows) await ctx.db.delete(row._id);
				deleted = rows.length;
				nextPhase =
					rows.length === BATCH_SIZE ? "VisitorClicks" : "Done";
				break;
			}
			case "Done":
				nextPhase = "Done";
		}
		return { deleted, hasMore: nextPhase !== "Done", nextPhase };
	},
});

export const resetDemoDataBatch = internalMutation({
	args: { tableIndex: v.optional(v.number()) },
	returns: tableResetResultValidator,
	handler: (ctx, { tableIndex }) => clearTableBatch(ctx, tableIndex),
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
					if (session.lifecycle?.state === "Active") {
						await finishSegmentResolution(
							ctx,
							session.segmentId,
							"PermanentFailure",
						);
					}
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

const readingCleanupPhaseValidator = v.union(
	v.literal("PendingRelations"),
	v.literal("KnowledgeChanges"),
	v.literal("StructuralReferences"),
	v.literal("AccumulatedKnowledge"),
	v.literal("OutgoingSemanticEdges"),
	v.literal("IncomingSemanticEdges"),
	v.literal("OutgoingGrammaticalEdges"),
	v.literal("IncomingGrammaticalEdges"),
	v.literal("Reading"),
);

type ReadingCleanupPhase =
	| "PendingRelations"
	| "KnowledgeChanges"
	| "StructuralReferences"
	| "AccumulatedKnowledge"
	| "OutgoingSemanticEdges"
	| "IncomingSemanticEdges"
	| "OutgoingGrammaticalEdges"
	| "IncomingGrammaticalEdges"
	| "Reading";

type ReadingCleanupCursor = {
	itemIndex: number;
	phase: ReadingCleanupPhase;
};

const readingCleanupCursorValidator = v.object({
	itemIndex: v.number(),
	phase: readingCleanupPhaseValidator,
});

function nextReadingPhase(phase: ReadingCleanupPhase): ReadingCleanupPhase {
	switch (phase) {
		case "PendingRelations":
			return "KnowledgeChanges";
		case "KnowledgeChanges":
			return "StructuralReferences";
		case "StructuralReferences":
			return "AccumulatedKnowledge";
		case "AccumulatedKnowledge":
			return "OutgoingSemanticEdges";
		case "OutgoingSemanticEdges":
			return "IncomingSemanticEdges";
		case "IncomingSemanticEdges":
			return "OutgoingGrammaticalEdges";
		case "OutgoingGrammaticalEdges":
			return "IncomingGrammaticalEdges";
		case "IncomingGrammaticalEdges":
			return "Reading";
		case "Reading":
			return "PendingRelations";
	}
}

export const clearReadingDataBatch = internalMutation({
	args: {
		readingKeys: v.array(v.string()),
		cursor: v.optional(readingCleanupCursorValidator),
	},
	returns: v.object({
		deleted: v.number(),
		deletedReadings: v.number(),
		hasMore: v.boolean(),
		nextCursor: v.union(v.null(), readingCleanupCursorValidator),
	}),
	handler: async (ctx, { readingKeys, cursor: cursorValue }) => {
		let cursor: ReadingCleanupCursor = cursorValue ?? {
			itemIndex: 0,
			phase: "PendingRelations",
		};
		if (
			!Number.isSafeInteger(cursor.itemIndex) ||
			cursor.itemIndex < 0 ||
			cursor.itemIndex > readingKeys.length
		) {
			throw new Error("Reading cleanup cursor is invalid.");
		}
		let deleted = 0;
		let deletedReadings = 0;
		let steps = 0;
		while (
			cursor.itemIndex < readingKeys.length &&
			deleted < CLEANUP_DELETE_BUDGET &&
			steps < MAX_CLEANUP_PHASE_STEPS
		) {
			steps += 1;
			const readingKey = readingKeys[cursor.itemIndex];
			if (!readingKey) break;
			const remaining = CLEANUP_DELETE_BUDGET - deleted;
			let phaseComplete = true;
			switch (cursor.phase) {
				case "PendingRelations": {
					const rows = await ctx.db
						.query("pendingSemanticRelations")
						.withIndex("by_source_reading_key", (q) =>
							q.eq("sourceReadingKey", readingKey),
						)
						.take(remaining);
					for (const row of rows) await ctx.db.delete(row._id);
					deleted += rows.length;
					phaseComplete = rows.length < remaining;
					break;
				}
				case "KnowledgeChanges": {
					const rows = await ctx.db
						.query("knowledgeChanges")
						.withIndex("by_owner_reading_key", (q) =>
							q.eq("ownerReadingKey", readingKey),
						)
						.take(remaining);
					for (const row of rows) await ctx.db.delete(row._id);
					deleted += rows.length;
					phaseComplete = rows.length < remaining;
					break;
				}
				case "StructuralReferences": {
					const rows = await ctx.db
						.query("structuralShadowReferences")
						.withIndex("by_owner_reading_key", (q) =>
							q.eq("ownerReadingKey", readingKey),
						)
						.take(remaining);
					for (const row of rows) await ctx.db.delete(row._id);
					deleted += rows.length;
					phaseComplete = rows.length < remaining;
					break;
				}
				case "AccumulatedKnowledge": {
					const row = await ctx.db
						.query("accumulatedKnowledge")
						.withIndex("by_owner_reading_key", (q) =>
							q.eq("ownerReadingKey", readingKey),
						)
						.unique();
					if (row) {
						await ctx.db.delete(row._id);
						deleted += 1;
					}
					break;
				}
				case "OutgoingSemanticEdges":
				case "IncomingSemanticEdges":
				case "OutgoingGrammaticalEdges":
				case "IncomingGrammaticalEdges": {
					const reading = await ctx.db
						.query("readings")
						.withIndex("by_reading_key", (q) =>
							q.eq("readingKey", readingKey),
						)
						.unique();
					if (!reading) break;
					if (cursor.phase === "OutgoingSemanticEdges") {
						const rows = await ctx.db
							.query("semanticRelationEdges")
							.withIndex("by_source_reading_id", (q) =>
								q.eq("sourceReadingId", reading._id),
							)
							.take(remaining);
						for (const row of rows) await ctx.db.delete(row._id);
						deleted += rows.length;
						phaseComplete = rows.length < remaining;
					} else if (cursor.phase === "IncomingSemanticEdges") {
						const rows = await ctx.db
							.query("semanticRelationEdges")
							.withIndex("by_target_reading_id", (q) =>
								q.eq("targetReadingId", reading._id),
							)
							.take(remaining);
						for (const row of rows) await ctx.db.delete(row._id);
						deleted += rows.length;
						phaseComplete = rows.length < remaining;
					} else {
						const outgoing =
							cursor.phase === "OutgoingGrammaticalEdges";
						const rows = await ctx.db
							.query("grammaticalRelationEdges")
							.withIndex(
								outgoing
									? "by_source_reading_id"
									: "by_target_reading_id",
								(q) =>
									outgoing
										? q.eq("sourceReadingId", reading._id)
										: q.eq("targetReadingId", reading._id),
							)
							.take(remaining);
						for (const row of rows) await ctx.db.delete(row._id);
						deleted += rows.length;
						phaseComplete = rows.length < remaining;
					}
					break;
				}
				case "Reading": {
					const reading = await ctx.db
						.query("readings")
						.withIndex("by_reading_key", (q) =>
							q.eq("readingKey", readingKey),
						)
						.unique();
					if (reading) {
						const entry = await ctx.db
							.query("readingEntries")
							.withIndex("by_reading_id", (q) =>
								q.eq("readingId", reading._id),
							)
							.unique();
						const required = entry ? 2 : 1;
						if (required > remaining) {
							phaseComplete = false;
							break;
						}
						if (entry) await ctx.db.delete(entry._id);
						await ctx.db.delete(reading._id);
						deleted += required;
						deletedReadings += 1;
					}
					break;
				}
			}
			if (!phaseComplete) break;
			if (cursor.phase === "Reading") {
				cursor = {
					itemIndex: cursor.itemIndex + 1,
					phase: "PendingRelations",
				};
			} else {
				cursor = { ...cursor, phase: nextReadingPhase(cursor.phase) };
			}
		}
		if (deleted > 0) await bumpDictionaryRevision(ctx);
		const nextCursor =
			cursor.itemIndex >= readingKeys.length ? null : cursor;
		return {
			deleted,
			deletedReadings,
			hasMore: nextCursor !== null,
			nextCursor,
		};
	},
});

const lemmaCleanupPhaseValidator = v.union(
	v.literal("Surfaces"),
	v.literal("IncomingSemanticEdges"),
	v.literal("OutgoingGrammaticalEdges"),
	v.literal("IncomingGrammaticalEdges"),
	v.literal("Lemma"),
);

type LemmaCleanupPhase =
	| "Surfaces"
	| "IncomingSemanticEdges"
	| "OutgoingGrammaticalEdges"
	| "IncomingGrammaticalEdges"
	| "Lemma";

type LemmaCleanupCursor = { itemIndex: number; phase: LemmaCleanupPhase };

const lemmaCleanupCursorValidator = v.object({
	itemIndex: v.number(),
	phase: lemmaCleanupPhaseValidator,
});

function nextLemmaPhase(phase: LemmaCleanupPhase): LemmaCleanupPhase {
	switch (phase) {
		case "Surfaces":
			return "IncomingSemanticEdges";
		case "IncomingSemanticEdges":
			return "OutgoingGrammaticalEdges";
		case "OutgoingGrammaticalEdges":
			return "IncomingGrammaticalEdges";
		case "IncomingGrammaticalEdges":
			return "Lemma";
		case "Lemma":
			return "Surfaces";
	}
}

export const clearLemmaDataBatch = internalMutation({
	args: {
		lemmaIds: v.array(v.id("lemmas")),
		cursor: v.optional(lemmaCleanupCursorValidator),
	},
	returns: v.object({
		deleted: v.number(),
		deletedLemmas: v.number(),
		hasMore: v.boolean(),
		nextCursor: v.union(v.null(), lemmaCleanupCursorValidator),
	}),
	handler: async (ctx, { lemmaIds, cursor: cursorValue }) => {
		let cursor: LemmaCleanupCursor = cursorValue ?? {
			itemIndex: 0,
			phase: "Surfaces",
		};
		if (
			!Number.isSafeInteger(cursor.itemIndex) ||
			cursor.itemIndex < 0 ||
			cursor.itemIndex > lemmaIds.length
		) {
			throw new Error("Lemma cleanup cursor is invalid.");
		}
		let deleted = 0;
		let deletedLemmas = 0;
		let steps = 0;
		while (
			cursor.itemIndex < lemmaIds.length &&
			deleted < CLEANUP_DELETE_BUDGET &&
			steps < MAX_CLEANUP_PHASE_STEPS
		) {
			steps += 1;
			const lemmaId = lemmaIds[cursor.itemIndex];
			if (!lemmaId) break;
			const lemma = await ctx.db.get(lemmaId);
			const reading = lemma
				? await ctx.db
						.query("readings")
						.withIndex("by_lemma_id", (q) =>
							q.eq("lemmaId", lemmaId),
						)
						.first()
				: null;
			if (!lemma || reading) {
				cursor = { itemIndex: cursor.itemIndex + 1, phase: "Surfaces" };
				continue;
			}
			const remaining = CLEANUP_DELETE_BUDGET - deleted;
			let phaseComplete = true;
			let skipLemma = false;
			switch (cursor.phase) {
				case "Surfaces": {
					const limit = Math.min(100, Math.floor(remaining / 2));
					if (limit === 0) {
						phaseComplete = false;
						break;
					}
					const surfaces = await ctx.db
						.query("surfaces")
						.withIndex("by_lemma_id", (q) =>
							q.eq("lemmaId", lemmaId),
						)
						.take(limit);
					for (const surface of surfaces) {
						const attestation = await ctx.db
							.query("attestations")
							.withIndex("by_surface_id", (q) =>
								q.eq("surfaceId", surface._id),
							)
							.first();
						if (attestation) {
							skipLemma = true;
							break;
						}
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
					phaseComplete = !skipLemma && surfaces.length < limit;
					break;
				}
				case "IncomingSemanticEdges": {
					const rows = await ctx.db
						.query("semanticRelationEdges")
						.withIndex("by_target_lemma_id", (q) =>
							q.eq("targetLemmaId", lemmaId),
						)
						.take(remaining);
					for (const row of rows) await ctx.db.delete(row._id);
					deleted += rows.length;
					phaseComplete = rows.length < remaining;
					break;
				}
				case "OutgoingGrammaticalEdges":
				case "IncomingGrammaticalEdges": {
					const outgoing =
						cursor.phase === "OutgoingGrammaticalEdges";
					const rows = await ctx.db
						.query("grammaticalRelationEdges")
						.withIndex(
							outgoing
								? "by_source_lemma_id"
								: "by_target_lemma_id",
							(q) =>
								outgoing
									? q.eq("sourceLemmaId", lemmaId)
									: q.eq("targetLemmaId", lemmaId),
						)
						.take(remaining);
					for (const row of rows) await ctx.db.delete(row._id);
					deleted += rows.length;
					phaseComplete = rows.length < remaining;
					break;
				}
				case "Lemma": {
					const dictionaryLemma = await ctx.db
						.query("dictionaryLemmas")
						.withIndex("by_lemma_id", (q) =>
							q.eq("lemmaId", lemmaId),
						)
						.unique();
					const required = dictionaryLemma ? 2 : 1;
					if (required > remaining) {
						phaseComplete = false;
						break;
					}
					if (dictionaryLemma)
						await ctx.db.delete(dictionaryLemma._id);
					await ctx.db.delete(lemmaId);
					deleted += required;
					deletedLemmas += 1;
					break;
				}
			}
			if (skipLemma || cursor.phase === "Lemma") {
				cursor = { itemIndex: cursor.itemIndex + 1, phase: "Surfaces" };
				continue;
			}
			if (!phaseComplete) break;
			cursor = { ...cursor, phase: nextLemmaPhase(cursor.phase) };
		}
		if (deleted > 0) await bumpDictionaryRevision(ctx);
		const nextCursor = cursor.itemIndex >= lemmaIds.length ? null : cursor;
		return {
			deleted,
			deletedLemmas,
			hasMore: nextCursor !== null,
			nextCursor,
		};
	},
});

/** Bounded full reset of every tf-demo table, processed in mutation batches. */
export const resetDemoData = internalAction({
	args: {},
	returns: v.object({ deleted: v.number() }),
	handler: async (ctx): Promise<{ deleted: number }> => {
		let deleted = 0;
		let tableIndex = 0;
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result = await ctx.runMutation(
				internal.demoReset.resetDemoDataBatch,
				{ tableIndex },
			);
			deleted += result.deleted;
			tableIndex = result.nextTableIndex;
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
		let tableIndex = 0;
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result = await ctx.runMutation(
				internal.demoReset.clearSharedDataBatch,
				{ tableIndex },
			);
			deleted += result.deleted;
			tableIndex = result.nextTableIndex;
			if (!result.hasMore) return { deleted };
		}
		throw new Error("Shared-data reset exceeded its batch limit.");
	},
});

/**
 * Removes one Text's derived graph while preserving the Text and Sentences.
 * Shared Readings, Lemmas, and Surfaces survive when another occurrence still
 * uses them; source-owned Knowledge and relation data are pruned with orphans.
 */
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
		let deletedReadings = 0;
		let readingCursor: ReadingCleanupCursor = {
			itemIndex: 0,
			phase: "PendingRelations",
		};
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result = await ctx.runMutation(
				internal.demoReset.clearReadingDataBatch,
				{ readingKeys: doomedReadingKeys, cursor: readingCursor },
			);
			removed += result.deleted;
			deletedReadings += result.deletedReadings;
			if (!result.nextCursor) break;
			readingCursor = result.nextCursor;
			if (batch === MAX_BATCHES - 1) {
				throw new Error(
					"Analysis stripping exceeded its Reading cleanup batch limit.",
				);
			}
		}

		const lemmaIds = [...new Set(doomed.map(({ lemmaId }) => lemmaId))];
		let deletedLemmas = 0;
		let lemmaCursor: LemmaCleanupCursor = {
			itemIndex: 0,
			phase: "Surfaces",
		};
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result = await ctx.runMutation(
				internal.demoReset.clearLemmaDataBatch,
				{ lemmaIds, cursor: lemmaCursor },
			);
			removed += result.deleted;
			deletedLemmas += result.deletedLemmas;
			if (!result.nextCursor) break;
			lemmaCursor = result.nextCursor;
			if (batch === MAX_BATCHES - 1) {
				throw new Error(
					"Analysis stripping exceeded its Lemma cleanup batch limit.",
				);
			}
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
		let phase: VisitorResetPhase = "ResolutionSessions";
		for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
			const result: {
				deleted: number;
				hasMore: boolean;
				nextPhase: VisitorResetPhase;
			} = await ctx.runMutation(
				internal.demoReset.clearVisitorDataBatch,
				{ visitorId, phase },
			);
			deleted += result.deleted;
			phase = result.nextPhase;
			if (!result.hasMore) return { deleted };
		}
		throw new Error("Visitor-data reset exceeded its batch limit.");
	},
});
