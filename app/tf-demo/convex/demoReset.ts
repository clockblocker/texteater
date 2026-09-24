import {
	paginationOptsValidator,
	paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id, TableNames } from "./_generated/dataModel";
import {
	type ActionCtx,
	action,
	internalAction,
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "./_generated/server";
import { requireAdmin } from "./deploymentFlags";
import { deleteKnowledgeAttempts } from "./model/knowledgeAttempts";
import { deleteResolutionSessions } from "./model/resolutionSessions";
import { loadStoredSegments } from "./model/storedSegments";
import {
	type StripTextAnalysisResult,
	stripTextAnalysisGraph,
} from "./model/textAnalysisStripping";

const BATCH_SIZE = 400;
/**
 * Bytes one table-clearing page may read before it stops. The page may run
 * one document, at most 1 MiB, past it, and deleting a row reads it again,
 * so a batch reads at most 10 MiB of Convex's 16 MiB per-transaction limit.
 */
const TABLE_BATCH_MAX_BYTES = 4 * 1024 * 1024;
/** Segments one strip step deletes, each with its Encounters and emptied Attestation. */
export const STRIP_SEGMENT_BATCH = 128;
/** Encounters and Segments one strip step may delete, far below the write limit. */
const STRIP_DELETE_BUDGET = 1_000;
const CLEANUP_DELETE_BUDGET = BATCH_SIZE - 1;
const MAX_BATCHES = 1_000;
const MAX_CLEANUP_PHASE_STEPS = 64;
const MAX_SENTENCES_PER_TEXT = 256;
const DESCRIPTOR_PAGE_SIZE = 20;
const TEXT_PAGE_SIZE = 20;

const resolutionInspectionTableNames = [
	"inspectionPayloads",
	"inspectionSteps",
	"inspectionClicks",
] as const satisfies readonly TableNames[];

/** Every application-owned tf-demo table removed by the bounded full reset. */
export const resetDemoTableNames = [
	"resolutionSessions",
	"resolutionRuns",
	"inspectionPayloads",
	"inspectionSteps",
	"inspectionClicks",
	"catalogGrowthSignals",
	"generatedRelationProposals",
	"generatedRelationRuns",
	"knowledgeProductionRuns",
	"intakeRuns",
	"knowledgeGenerationAttempts",
	"relationPublicationControls",
	"knowledgeSettings",
	"personalAnnotations",
	"readingLanguageLayouts",
	"readingFamilyKindLayouts",
	"structuralShadowReferences",
	"knowledgeChanges",
	"definitionTexts",
	"accumulatedKnowledge",
	"pendingSemanticRelations",
	"shadows",
	"attestations",
	"visitorClicks",
	"ownedSurfaces",
	"readingEntries",
	"semanticRelationEdges",
	"readings",
	"dictionaryLemmas",
	"surfaces",
	"lemmas",
	"segments",
	"sentenceAnalyses",
	"sentences",
	"texts",
] as const satisfies readonly TableNames[];

function assertVisitorId(visitorId: string): void {
	if (visitorId.trim().length === 0 || visitorId.length > 200) {
		throw new Error("visitorId must contain 1 to 200 characters.");
	}
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
	const { deleted, cleared } = await deleteTableBatch(ctx, tableName);
	const nextTableIndex = cleared ? tableIndex + 1 : tableIndex;
	return {
		deleted,
		hasMore: nextTableIndex < resetDemoTableNames.length,
		nextTableIndex,
	};
}

/**
 * Deletes up to `BATCH_SIZE` rows of one table, stopping early once the
 * batch has read `TABLE_BATCH_MAX_BYTES`, so tables of large rows such as
 * `inspectionPayloads` stay inside the transaction limits.
 */
async function deleteTableBatch(ctx: MutationCtx, tableName: TableNames) {
	const { page, isDone } = await ctx.db.query(tableName).paginate({
		cursor: null,
		numItems: BATCH_SIZE,
		maximumBytesRead: TABLE_BATCH_MAX_BYTES,
	});
	await Promise.all(page.map((document) => ctx.db.delete(document._id)));
	return { deleted: page.length, cleared: isDone };
}

/**
 * Runs table-clearing batches until they report no more work. Every batch
 * deletes rows or moves to the next table, so the run ends after about as
 * many batches as the rows need, with no fixed cap on the rows cleared.
 */
async function clearTablesInBatches(
	runBatch: (tableIndex: number) => Promise<{
		deleted: number;
		hasMore: boolean;
		nextTableIndex: number;
	}>,
): Promise<number> {
	let deleted = 0;
	let tableIndex = 0;
	for (;;) {
		const result = await runBatch(tableIndex);
		if (
			result.hasMore &&
			result.deleted === 0 &&
			result.nextTableIndex === tableIndex
		) {
			throw new Error("A table-clearing batch made no progress.");
		}
		deleted += result.deleted;
		tableIndex = result.nextTableIndex;
		if (!result.hasMore) return deleted;
	}
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
	v.literal("PersonalAnnotations"),
	v.literal("ReadingLanguageLayouts"),
	v.literal("ReadingFamilyKindLayouts"),
	v.literal("VisitorClicks"),
	v.literal("Done"),
);

type VisitorResetPhase =
	| "ResolutionSessions"
	| "GenerationAttempts"
	| "KnowledgeSettings"
	| "PersonalAnnotations"
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
				await deleteResolutionSessions(ctx, rows);
				deleted = rows.length;
				nextPhase =
					rows.length === BATCH_SIZE
						? "ResolutionSessions"
						: "GenerationAttempts";
				break;
			}
			case "GenerationAttempts": {
				const attempts = await ctx.db
					.query("knowledgeGenerationAttempts")
					.withIndex("by_visitor_id_and_updated_at", (q) =>
						q.eq("visitorId", visitorId),
					)
					.take(BATCH_SIZE);
				const removed = await deleteKnowledgeAttempts(
					ctx,
					attempts,
					BATCH_SIZE,
				);
				deleted = removed.deleted;
				nextPhase =
					removed.complete && attempts.length < BATCH_SIZE
						? "KnowledgeSettings"
						: "GenerationAttempts";
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
				nextPhase = "PersonalAnnotations";
				break;
			}
			case "PersonalAnnotations": {
				const rows = await ctx.db
					.query("personalAnnotations")
					.withIndex("by_visitor_id_and_reading_id", (q) =>
						q.eq("visitorId", visitorId),
					)
					.take(BATCH_SIZE);
				await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
				deleted = rows.length;
				nextPhase =
					rows.length === BATCH_SIZE
						? "PersonalAnnotations"
						: "ReadingLanguageLayouts";
				break;
			}
			case "ReadingLanguageLayouts": {
				const rows = await ctx.db
					.query("readingLanguageLayouts")
					.withIndex("by_visitor_id_and_target_language", (q) =>
						q.eq("visitorId", visitorId),
					)
					.take(BATCH_SIZE);
				await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
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
				await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
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
				await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
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

/**
 * Visitor Texts only. A Definition Text is stripped with its Reading when
 * that Reading is pruned, so a surviving Reading keeps a clickable definition.
 */
export const listTextIds = internalQuery({
	args: { paginationOpts: paginationOptsValidator },
	returns: paginationResultValidator(v.id("texts")),
	handler: async (ctx, { paginationOpts }) => {
		const result = await ctx.db
			.query("texts")
			.withIndex("by_origin_kind", (q) => q.eq("origin.kind", undefined))
			.paginate(paginationOpts);
		return { ...result, page: result.page.map((text) => text._id) };
	},
});

const inspectionResetResultValidator = v.object({
	deleted: v.number(),
	hasMore: v.boolean(),
	nextTableIndex: v.number(),
});

export const clearResolutionInspectionBatch = internalMutation({
	args: { tableIndex: v.optional(v.number()) },
	returns: inspectionResetResultValidator,
	handler: async (ctx, { tableIndex: tableIndexValue }) => {
		const tableIndex = tableIndexValue ?? 0;
		if (
			!Number.isSafeInteger(tableIndex) ||
			tableIndex < 0 ||
			tableIndex > resolutionInspectionTableNames.length
		) {
			throw new Error(
				"Resolution inspection reset table index is invalid.",
			);
		}
		if (tableIndex === resolutionInspectionTableNames.length) {
			return { deleted: 0, hasMore: false, nextTableIndex: tableIndex };
		}
		const tableName = resolutionInspectionTableNames[tableIndex];
		if (!tableName) {
			throw new Error(
				"Resolution inspection reset table index is invalid.",
			);
		}
		const { deleted, cleared } = await deleteTableBatch(ctx, tableName);
		const nextTableIndex = cleared ? tableIndex + 1 : tableIndex;
		return {
			deleted,
			hasMore: nextTableIndex < resolutionInspectionTableNames.length,
			nextTableIndex,
		};
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
		const segmentsBySentence = await Promise.all(
			sentences.map((sentence) => loadStoredSegments(ctx, sentence._id)),
		);
		const attestationIds = new Set<Id<"attestations">>();
		for (const segments of segmentsBySentence) {
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

/**
 * One bounded step of stripping a Text: from the first Sentence at or after
 * `fromPosition` that still has analysis, it deletes its Sentence Analysis,
 * then its Resolution Sessions, then up to `STRIP_SEGMENT_BATCH` Segments
 * with their Visitor Encounters and the Attestations they leave memberless.
 * `nextPosition` is where the next step resumes.
 */
export const stripTextAnalysisGraphBatch = internalMutation({
	args: { textId: v.id("texts"), fromPosition: v.optional(v.number()) },
	returns: v.object({
		deleted: v.number(),
		hasMore: v.boolean(),
		nextPosition: v.number(),
	}),
	handler: async (ctx, { textId, fromPosition = 0 }) => {
		const done = { deleted: 0, hasMore: false, nextPosition: fromPosition };
		if (!(await ctx.db.get(textId))) return done;
		const sentences = ctx.db
			.query("sentences")
			.withIndex("by_text_id_and_position", (q) =>
				q.eq("textId", textId).gte("position", fromPosition),
			);
		for await (const sentence of sentences) {
			const deleted = await stripSentenceAnalysisBatch(ctx, sentence._id);
			if (deleted > 0) {
				return {
					deleted,
					hasMore: true,
					nextPosition: sentence.position,
				};
			}
		}
		return done;
	},
});

/** Deletes one bounded step of a Sentence's analysis; 0 when none is left. */
async function stripSentenceAnalysisBatch(
	ctx: MutationCtx,
	sentenceId: Id<"sentences">,
): Promise<number> {
	const analyses = await ctx.db
		.query("sentenceAnalyses")
		.withIndex("by_sentence_id", (q) => q.eq("sentenceId", sentenceId))
		.take(STRIP_SEGMENT_BATCH);
	if (analyses.length > 0) {
		await Promise.all(
			analyses.map((analysis) => ctx.db.delete(analysis._id)),
		);
		return analyses.length;
	}
	const sessions = await ctx.db
		.query("resolutionSessions")
		.withIndex("by_sentence_id", (q) => q.eq("sentenceId", sentenceId))
		.take(STRIP_SEGMENT_BATCH);
	if (sessions.length > 0) {
		await deleteResolutionSessions(ctx, sessions);
		return sessions.length;
	}

	const segments = await ctx.db
		.query("segments")
		.withIndex("by_sentence_id_and_index", (q) =>
			q.eq("sentenceId", sentenceId),
		)
		.take(STRIP_SEGMENT_BATCH);
	let deleted = 0;
	const leftAttestationIds = new Set<Id<"attestations">>();
	for (const segment of segments) {
		const clickBudget = STRIP_DELETE_BUDGET - deleted;
		const clicks = await ctx.db
			.query("visitorClicks")
			.withIndex("by_segment_id", (q) => q.eq("segmentId", segment._id))
			.take(clickBudget);
		await Promise.all(clicks.map((click) => ctx.db.delete(click._id)));
		deleted += clicks.length;
		// A Segment goes only after its last Encounter; the rest wait a step.
		if (clicks.length === clickBudget) break;
		const attestationId = segment.attestationMembership?.attestationId;
		if (attestationId) leftAttestationIds.add(attestationId);
		await ctx.db.delete(segment._id);
		deleted += 1;
	}
	for (const attestationId of leftAttestationIds) {
		const survivor = await ctx.db
			.query("segments")
			.withIndex("by_attestation_id", (q) =>
				q.eq("attestationMembership.attestationId", attestationId),
			)
			.first();
		if (!survivor && (await ctx.db.get(attestationId))) {
			await ctx.db.delete(attestationId);
			deleted += 1;
		}
	}
	return deleted;
}

export const describeReadingCleanupCandidates = internalQuery({
	args: { readingIds: v.array(v.id("readings")) },
	returns: v.array(readingDescriptorValidator),
	handler: async (ctx, { readingIds }) => {
		if (readingIds.length > DESCRIPTOR_PAGE_SIZE) {
			throw new Error(
				`Describe at most ${DESCRIPTOR_PAGE_SIZE} Readings per call.`,
			);
		}
		const descriptors = await Promise.all(
			readingIds.map(async (readingId) => {
				const reading = await ctx.db.get(readingId);
				if (!reading) return null;
				const [lemma, attestation] = await Promise.all([
					ctx.db.get(reading.lemmaId),
					ctx.db
						.query("attestations")
						.withIndex("by_reading_id", (q) =>
							q.eq("readingId", readingId),
						)
						.first(),
				]);
				if (!lemma) return null;
				return {
					readingId,
					readingKey: reading.readingKey,
					lemmaId: lemma._id,
					lemmaKey: lemma.lemmaKey,
					hasRemainingSource: Boolean(attestation),
				};
			}),
		);
		return descriptors.flatMap((descriptor) =>
			descriptor ? [descriptor] : [],
		);
	},
});

/**
 * Reading cleanup phases, in order. Attempts go first: once an attempt is
 * gone its in-flight publication is rejected, so it cannot write Knowledge
 * back behind a later phase.
 */
const readingCleanupPhaseValidator = v.union(
	v.literal("GenerationAttempts"),
	v.literal("PendingRelations"),
	v.literal("KnowledgeChanges"),
	v.literal("StructuralReferences"),
	v.literal("AccumulatedKnowledge"),
	v.literal("GeneratedRelationRuns"),
	v.literal("GeneratedRelationProposals"),
	v.literal("PersonalAnnotations"),
	v.literal("OutgoingSemanticEdges"),
	v.literal("IncomingSemanticEdges"),
	v.literal("Reading"),
);

type ReadingCleanupPhase =
	| "GenerationAttempts"
	| "PendingRelations"
	| "KnowledgeChanges"
	| "StructuralReferences"
	| "AccumulatedKnowledge"
	| "GeneratedRelationRuns"
	| "GeneratedRelationProposals"
	| "PersonalAnnotations"
	| "OutgoingSemanticEdges"
	| "IncomingSemanticEdges"
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
		case "GenerationAttempts":
			return "PendingRelations";
		case "PendingRelations":
			return "KnowledgeChanges";
		case "KnowledgeChanges":
			return "StructuralReferences";
		case "StructuralReferences":
			return "AccumulatedKnowledge";
		case "AccumulatedKnowledge":
			return "GeneratedRelationRuns";
		case "GeneratedRelationRuns":
			return "GeneratedRelationProposals";
		case "GeneratedRelationProposals":
			return "PersonalAnnotations";
		case "PersonalAnnotations":
			return "OutgoingSemanticEdges";
		case "OutgoingSemanticEdges":
			return "IncomingSemanticEdges";
		case "IncomingSemanticEdges":
			return "Reading";
		case "Reading":
			return "GenerationAttempts";
	}
}

function takeReadingOwnedRows(
	ctx: MutationCtx,
	phase:
		| "GeneratedRelationRuns"
		| "GeneratedRelationProposals"
		| "PersonalAnnotations"
		| "OutgoingSemanticEdges"
		| "IncomingSemanticEdges",
	readingId: Id<"readings">,
	limit: number,
): Promise<{ _id: Id<TableNames> }[]> {
	switch (phase) {
		case "GeneratedRelationRuns":
			return ctx.db
				.query("generatedRelationRuns")
				.withIndex("by_source_reading_id", (q) =>
					q.eq("sourceReadingId", readingId),
				)
				.take(limit);
		case "GeneratedRelationProposals":
			return ctx.db
				.query("generatedRelationProposals")
				.withIndex("by_source_reading_id", (q) =>
					q.eq("sourceReadingId", readingId),
				)
				.take(limit);
		case "PersonalAnnotations":
			return ctx.db
				.query("personalAnnotations")
				.withIndex("by_reading_id", (q) => q.eq("readingId", readingId))
				.take(limit);
		case "OutgoingSemanticEdges":
			return ctx.db
				.query("semanticRelationEdges")
				.withIndex("by_source_reading_id", (q) =>
					q.eq("sourceReadingId", readingId),
				)
				.take(limit);
		case "IncomingSemanticEdges":
			return ctx.db
				.query("semanticRelationEdges")
				.withIndex("by_target_reading_id", (q) =>
					q.eq("targetReadingId", readingId),
				)
				.take(limit);
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
			phase: "GenerationAttempts",
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
					await Promise.all(
						rows.map((row) => ctx.db.delete(row._id)),
					);
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
					await Promise.all(
						rows.map((row) => ctx.db.delete(row._id)),
					);
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
					await Promise.all(
						rows.map((row) => ctx.db.delete(row._id)),
					);
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
				case "GenerationAttempts": {
					// Attempts are keyed by the Reading's identity key, so a
					// leftover one would block the next Reading with this key.
					const attempts = await ctx.db
						.query("knowledgeGenerationAttempts")
						.withIndex("by_owner_reading_key_and_updated_at", (q) =>
							q.eq("ownerReadingKey", readingKey),
						)
						.take(remaining);
					const removed = await deleteKnowledgeAttempts(
						ctx,
						attempts,
						remaining,
					);
					deleted += removed.deleted;
					phaseComplete =
						removed.complete && attempts.length < remaining;
					break;
				}
				case "GeneratedRelationRuns":
				case "GeneratedRelationProposals":
				case "PersonalAnnotations":
				case "OutgoingSemanticEdges":
				case "IncomingSemanticEdges": {
					const reading = await ctx.db
						.query("readings")
						.withIndex("by_reading_key", (q) =>
							q.eq("readingKey", readingKey),
						)
						.unique();
					if (!reading) break;
					const rows = await takeReadingOwnedRows(
						ctx,
						cursor.phase,
						reading._id,
						remaining,
					);
					await Promise.all(
						rows.map((row) => ctx.db.delete(row._id)),
					);
					deleted += rows.length;
					phaseComplete = rows.length < remaining;
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
						await Promise.all([
							...(entry ? [ctx.db.delete(entry._id)] : []),
							ctx.db.delete(reading._id),
						]);
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
					phase: "GenerationAttempts",
				};
			} else {
				cursor = { ...cursor, phase: nextReadingPhase(cursor.phase) };
			}
		}
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
	v.literal("Lemma"),
);

type LemmaCleanupPhase = "Surfaces" | "IncomingSemanticEdges" | "Lemma";

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
					const surfaceState = await Promise.all(
						surfaces.map(async (surface) => {
							const [attestation, entry] = await Promise.all([
								ctx.db
									.query("attestations")
									.withIndex("by_surface_id", (q) =>
										q.eq("surfaceId", surface._id),
									)
									.first(),
								ctx.db
									.query("ownedSurfaces")
									.withIndex("by_surface_id", (q) =>
										q.eq("surfaceId", surface._id),
									)
									.unique(),
							]);
							return { surface, attestation, entry };
						}),
					);
					const protectedIndex = surfaceState.findIndex(
						({ attestation }) => Boolean(attestation),
					);
					skipLemma = protectedIndex !== -1;
					const deletable =
						protectedIndex === -1
							? surfaceState
							: surfaceState.slice(0, protectedIndex);
					await Promise.all(
						deletable.flatMap(({ surface, entry }) => [
							...(entry ? [ctx.db.delete(entry._id)] : []),
							ctx.db.delete(surface._id),
						]),
					);
					deleted += deletable.reduce(
						(count, { entry }) => count + (entry ? 2 : 1),
						0,
					);
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
					await Promise.all(
						rows.map((row) => ctx.db.delete(row._id)),
					);
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
					await Promise.all([
						...(dictionaryLemma
							? [ctx.db.delete(dictionaryLemma._id)]
							: []),
						ctx.db.delete(lemmaId),
					]);
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
		const nextCursor = cursor.itemIndex >= lemmaIds.length ? null : cursor;
		return {
			deleted,
			deletedLemmas,
			hasMore: nextCursor !== null,
			nextCursor,
		};
	},
});

/** Clears every tf-demo table, processed in bounded mutation batches. */
async function clearAllTables(ctx: ActionCtx): Promise<{ deleted: number }> {
	return {
		deleted: await clearTablesInBatches((tableIndex) =>
			ctx.runMutation(internal.demoReset.clearSharedDataBatch, {
				tableIndex,
			}),
		),
	};
}

/** Full reset for `bun run reset`. */
export const resetDemoData = internalAction({
	args: {},
	returns: v.object({ deleted: v.number() }),
	handler: clearAllTables,
});

export const clearSharedData = action({
	args: {},
	returns: v.object({ deleted: v.number() }),
	handler: (ctx) => {
		requireAdmin();
		return clearAllTables(ctx);
	},
});

export type StripAnalysesResult = StripTextAnalysisResult & {
	strippedTexts: number;
	removedInspectionRecords: number;
};

export async function stripAllAnalyses(
	ctx: ActionCtx,
): Promise<StripAnalysesResult> {
	let cursor: string | null = null;
	let strippedTexts = 0;
	let removed = 0;
	let deletedReadings = 0;
	let deletedLemmas = 0;
	for (let pageIndex = 0; pageIndex < MAX_BATCHES; pageIndex += 1) {
		const page: {
			page: Id<"texts">[];
			isDone: boolean;
			continueCursor: string;
		} = await ctx.runQuery(internal.demoReset.listTextIds, {
			paginationOpts: { cursor, numItems: TEXT_PAGE_SIZE },
		});
		for (const textId of page.page) {
			const result = await stripTextAnalysisGraph(ctx, textId);
			strippedTexts += 1;
			removed += result.removed;
			deletedReadings += result.deletedReadings;
			deletedLemmas += result.deletedLemmas;
		}
		if (page.isDone) break;
		cursor = page.continueCursor;
		if (pageIndex === MAX_BATCHES - 1) {
			throw new Error("Analysis stripping exceeded its Text page limit.");
		}
	}

	const removedInspectionRecords = await clearTablesInBatches((tableIndex) =>
		ctx.runMutation(internal.demoReset.clearResolutionInspectionBatch, {
			tableIndex,
		}),
	);
	return {
		strippedTexts,
		removed,
		deletedReadings,
		deletedLemmas,
		removedInspectionRecords,
	};
}

/** Strips every Text and clears the Resolution Inspector's retained records. */
export const stripAnalyses = action({
	args: {},
	returns: v.object({
		strippedTexts: v.number(),
		removed: v.number(),
		deletedReadings: v.number(),
		deletedLemmas: v.number(),
		removedInspectionRecords: v.number(),
	}),
	handler: (ctx): Promise<StripAnalysesResult> => {
		requireAdmin();
		return stripAllAnalyses(ctx);
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
