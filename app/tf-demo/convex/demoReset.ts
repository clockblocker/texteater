import {
	paginationOptsValidator,
	paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { assertIdentifier } from "../server/identifiers";
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
const MAX_BATCHES = 1_000;
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
	"sentences",
	"texts",
] as const satisfies readonly TableNames[];

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
		assertIdentifier(visitorId, "visitorId");
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
		assertIdentifier(visitorId, "visitorId");
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
