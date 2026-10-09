import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "./_generated/server";
import { deleteKnowledgeAttempts } from "./model/knowledgeAttempts";
import {
	cleanupPhase,
	cleanupStart,
	deleteOwnedRows,
	LEMMA_CLEANUP_PHASES,
	type LemmaCleanupCursor,
	lemmaCleanupCursorValidator,
	nextItem,
	nextPhase,
	READING_CLEANUP_PHASES,
	type ReadingCleanupCursor,
	readingCleanupCursorValidator,
} from "./model/ownedRowCleanup";
import { deleteResolutionSessions } from "./model/resolutionSessions";
import { loadStoredSegments } from "./model/storedSegments";
import { DESCRIPTOR_PAGE_SIZE } from "./model/textAnalysisStripping";

/** Segments one strip step deletes, each with its Encounters and emptied Attestation. */
export const STRIP_SEGMENT_BATCH = 128;
/** Encounters and Segments one strip step may delete, far below the write limit. */
const STRIP_DELETE_BUDGET = 1_000;
/** Rows one Reading or Lemma cleanup step may delete. */
const CLEANUP_DELETE_BUDGET = 399;
const MAX_CLEANUP_PHASE_STEPS = 64;
const MAX_SENTENCES_PER_TEXT = 256;

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
 * `fromPosition` that still has analysis, it deletes its Resolution
 * Sessions, then clears its units and deletes up to `STRIP_SEGMENT_BATCH`
 * Segments with their Visitor Encounters and the Attestations they leave
 * memberless.
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
			const deleted = await stripSentenceAnalysisBatch(ctx, sentence);
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
	sentence: Doc<"sentences">,
): Promise<number> {
	const sentenceId = sentence._id;
	const sessions = await ctx.db
		.query("resolutionSessions")
		.withIndex("by_sentence_id", (q) => q.eq("sentenceId", sentenceId))
		.take(STRIP_SEGMENT_BATCH);
	if (sessions.length > 0) {
		await deleteResolutionSessions(ctx, sessions);
		return sessions.length;
	}
	// The units index into the Segments below, so they go with them, and
	// so does a failed segmentation's mark; fields, not rows, they are not
	// counted.
	if (sentence.units !== undefined || sentence.segmentationFailed)
		await ctx.db.patch(sentenceId, {
			units: undefined,
			segmentationFailed: undefined,
		});

	const segments = await ctx.db
		.query("segments")
		.withIndex("by_sentence_id_and_index", (q) =>
			q.eq("sentenceId", sentenceId),
		)
		.take(STRIP_SEGMENT_BATCH);
	let deleted = 0;
	const leftAttestationIds = new Set<Id<"attestations">>();
	for (const segment of segments) {
		const encounterBudget = STRIP_DELETE_BUDGET - deleted;
		const encounters = await ctx.db
			.query("visitorEncounters")
			.withIndex("by_segment_id_and_attestation_id", (q) =>
				q.eq("segmentId", segment._id),
			)
			.take(encounterBudget);
		await Promise.all(
			encounters.map((encounter) => ctx.db.delete(encounter._id)),
		);
		deleted += encounters.length;
		// A Segment goes only after its last Encounter; the rest wait a step.
		if (encounters.length === encounterBudget) break;
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

function findReading(ctx: MutationCtx, readingKey: string) {
	return ctx.db
		.query("readings")
		.withIndex("by_reading_key", (q) => q.eq("readingKey", readingKey))
		.unique();
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
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
	handler: async (ctx, { readingKeys, cursor: cursorValue }) => {
		let cursor: ReadingCleanupCursor =
			cursorValue ?? cleanupStart(READING_CLEANUP_PHASES);
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
			const phase = cleanupPhase(READING_CLEANUP_PHASES, cursor.phase);
			if ("table" in phase) {
				const key =
					phase.keyedBy === "readingKey"
						? readingKey
						: (await findReading(ctx, readingKey))?._id;
				if (key) {
					const removed = await deleteOwnedRows(
						ctx,
						phase,
						key,
						remaining,
					);
					deleted += removed;
					phaseComplete = removed < remaining;
				}
			} else {
				switch (phase.phase) {
					case "GenerationAttempts": {
						// Attempts are keyed by the Reading's identity key, so a
						// leftover one would block the next Reading with this key.
						const attempts = await ctx.db
							.query("knowledgeGenerationAttempts")
							.withIndex(
								"by_owner_reading_key_and_updated_at",
								(q) => q.eq("ownerReadingKey", readingKey),
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
					case "Reading": {
						const reading = await findReading(ctx, readingKey);
						if (!reading) break;
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
						break;
					}
				}
			}
			if (!phaseComplete) break;
			cursor = nextPhase(READING_CLEANUP_PHASES, cursor);
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
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
	handler: async (ctx, { lemmaIds, cursor: cursorValue }) => {
		let cursor: LemmaCleanupCursor =
			cursorValue ?? cleanupStart(LEMMA_CLEANUP_PHASES);
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
				cursor = nextItem(LEMMA_CLEANUP_PHASES, cursor);
				continue;
			}
			const remaining = CLEANUP_DELETE_BUDGET - deleted;
			let phaseComplete = true;
			let skipLemma = false;
			const phase = cleanupPhase(LEMMA_CLEANUP_PHASES, cursor.phase);
			if ("table" in phase) {
				const removed = await deleteOwnedRows(
					ctx,
					phase,
					lemmaId,
					remaining,
				);
				deleted += removed;
				phaseComplete = removed < remaining;
			} else {
				switch (phase.phase) {
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
			}
			if (skipLemma) {
				cursor = nextItem(LEMMA_CLEANUP_PHASES, cursor);
				continue;
			}
			if (!phaseComplete) break;
			cursor = nextPhase(LEMMA_CLEANUP_PHASES, cursor);
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
