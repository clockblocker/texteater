import { v } from "convex/values";

import { internalQuery, type QueryCtx } from "../_generated/server";
import { lemmaValue } from "../model/occurrenceAttestations";
import { requireRecord } from "../model/readingKnowledge";
import { pendingShadowDescriptor } from "../model/shadows";
import { lemmaValueValidator } from "../model/validators";
import {
	assertPlanBudget,
	currentRevision,
	findLemmaByKey,
	findReadingByKey,
	findSurface,
	loadReading,
	loadRelationInventory,
	MAX_CLEANUP_CANDIDATE_LEMMAS,
	MAX_PENDING_RELATIONS_PER_SLICE,
	MAX_READING_CANDIDATES,
	pendingLocatorKey,
	uniqueBoundedKeys,
} from "./storage";

export const getDumdictRevision = internalQuery({
	args: {},
	returns: v.string(),
	handler: async (ctx) => currentRevision(ctx),
});

export const findDumdictStoredReadings = internalQuery({
	args: { lemmaKey: v.string() },
	returns: v.object({ revision: v.string(), candidates: v.array(v.any()) }),
	handler: async (ctx, { lemmaKey }) => {
		const [revision, lemma] = await Promise.all([
			currentRevision(ctx),
			ctx.db
				.query("lemmas")
				.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", lemmaKey))
				.unique(),
		]);
		if (!lemma) return { revision, candidates: [] };
		const [dictionaryLemma, readings] = await Promise.all([
			ctx.db
				.query("dictionaryLemmas")
				.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
				.unique(),
			ctx.db
				.query("readings")
				.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
				.take(MAX_READING_CANDIDATES + 1),
		]);
		if (!dictionaryLemma) return { revision, candidates: [] };
		if (readings.length > MAX_READING_CANDIDATES) {
			throw new Error(
				`Stored Reading lookup supports at most ${MAX_READING_CANDIDATES} candidates.`,
			);
		}
		const entries = await Promise.all(
			readings.map((reading) => loadReading(ctx, reading)),
		);
		return {
			revision,
			candidates: readings.flatMap((_reading, index) => {
				const entry = entries[index];
				return entry
					? [
							{
								reading: entry.entry,
								lemma: { lemma: lemmaValue(lemma) },
							},
						]
					: [];
			}),
		};
	},
});

const readingEntryContextArgsValidator = v.union(
	v.object({
		intent: v.literal("addNewNote"),
		lemmaKey: v.string(),
		proposedLemma: lemmaValueValidator,
		readingKey: v.string(),
		surfaceKeys: v.array(v.string()),
		explicitLemmaTargetKeys: v.array(v.string()),
		pendingLocatorKeys: v.array(v.string()),
	}),
	v.object({
		intent: v.literal("applyGeneratedKnowledge"),
		readingKey: v.string(),
		pendingLocatorKeys: v.array(v.string()),
	}),
	v.object({
		intent: v.literal("ensureOwnedSurface"),
		lemmaKey: v.string(),
		readingKey: v.string(),
		surfaceKey: v.string(),
	}),
	v.object({
		intent: v.literal("ensureReadingEntry"),
		lemmaKey: v.string(),
		readingKey: v.string(),
	}),
);

async function loadExactPendingRecords(
	ctx: QueryCtx,
	rawLocatorKeys: readonly string[],
) {
	const locatorKeys = uniqueBoundedKeys(
		rawLocatorKeys,
		"Reading Entry exact pending-relation loading",
	);
	const rows = await Promise.all(
		locatorKeys.map((locatorKey) =>
			ctx.db
				.query("pendingSemanticRelations")
				.withIndex("by_locator_key", (q) =>
					q.eq("locatorKey", locatorKey),
				)
				.unique(),
		),
	);
	return rows.flatMap((row, index) => {
		if (!row) return [];
		const record = requireRecord(
			row.record,
			"Pending Semantic Relation record",
		);
		if (
			row.locatorKey !== locatorKeys[index] ||
			pendingLocatorKey(record) !== row.locatorKey
		)
			throw new Error(
				"Pending Semantic Relation index does not match its canonical locator.",
			);
		return [record];
	});
}

export const loadDumdictReadingEntryContext = internalQuery({
	args: { request: readingEntryContextArgsValidator },
	returns: v.any(),
	handler: async (ctx, { request: args }) => {
		switch (args.intent) {
			case "ensureReadingEntry": {
				const [revision, lemma, reading] = await Promise.all([
					currentRevision(ctx),
					findLemmaByKey(ctx, args.lemmaKey),
					findReadingByKey(ctx, args.readingKey),
				]);
				return {
					intent: args.intent,
					revision,
					...(lemma
						? {
								existingLemma: {
									lemma: lemmaValue(lemma.canonical),
								},
							}
						: {}),
					...(reading ? { existingReading: reading.entry } : {}),
				};
			}
			case "ensureOwnedSurface": {
				const [revision, lemma, reading, surface] = await Promise.all([
					currentRevision(ctx),
					findLemmaByKey(ctx, args.lemmaKey),
					findReadingByKey(ctx, args.readingKey),
					findSurface(ctx, args.surfaceKey),
				]);
				return {
					intent: args.intent,
					revision,
					...(lemma
						? {
								existingLemma: {
									lemma: lemmaValue(lemma.canonical),
								},
							}
						: {}),
					...(reading ? { existingReading: reading.entry } : {}),
					existingOwnedSurfaces: surface ? [surface.entry] : [],
				};
			}
			case "applyGeneratedKnowledge": {
				assertPlanBudget(
					1 + args.pendingLocatorKeys.length,
					"Generated-Knowledge context",
				);
				const [revision, reading, pending, inventory] =
					await Promise.all([
						currentRevision(ctx),
						findReadingByKey(ctx, args.readingKey),
						loadExactPendingRecords(ctx, args.pendingLocatorKeys),
						loadRelationInventory(ctx),
					]);
				return {
					intent: args.intent,
					revision,
					...(reading ? { existingReading: reading.entry } : {}),
					exactPendingRelations: pending,
					relationLemmas: inventory.lemmas,
					relationReadings: inventory.readings,
				};
			}
			case "addNewNote": {
				assertPlanBudget(
					2 +
						args.surfaceKeys.length +
						args.explicitLemmaTargetKeys.length +
						args.pendingLocatorKeys.length,
					"New-note context",
				);
				const surfaceKeys = uniqueBoundedKeys(
					args.surfaceKeys,
					"New-note owned Surface loading",
				);
				const explicitLemmaTargetKeys = uniqueBoundedKeys(
					args.explicitLemmaTargetKeys,
					"New-note explicit Lemma target loading",
				);
				const [
					revision,
					lemma,
					reading,
					surfaces,
					explicitTargets,
					pending,
					matchingPending,
					inventory,
				] = await Promise.all([
					currentRevision(ctx),
					findLemmaByKey(ctx, args.lemmaKey),
					findReadingByKey(ctx, args.readingKey),
					Promise.all(
						surfaceKeys.map((key) => findSurface(ctx, key)),
					),
					Promise.all(
						explicitLemmaTargetKeys.map((key) =>
							findLemmaByKey(ctx, key),
						),
					),
					loadExactPendingRecords(ctx, args.pendingLocatorKeys),
					ctx.db
						.query("pendingSemanticRelations")
						.withIndex("by_target_canonical_form", (q) =>
							q.eq(
								"targetCanonicalForm",
								args.proposedLemma.canonicalForm,
							),
						)
						.take(MAX_PENDING_RELATIONS_PER_SLICE + 1),
					loadRelationInventory(ctx),
				]);
				if (matchingPending.length > MAX_PENDING_RELATIONS_PER_SLICE)
					throw new Error(
						`A pending-relation slice supports at most ${MAX_PENDING_RELATIONS_PER_SLICE} matching records.`,
					);
				return {
					intent: args.intent,
					revision,
					...(lemma
						? {
								existingLemma: {
									lemma: lemmaValue(lemma.canonical),
								},
							}
						: {}),
					...(reading ? { existingReading: reading.entry } : {}),
					existingOwnedSurfaces: surfaces.flatMap((surface) =>
						surface ? [surface.entry] : [],
					),
					explicitExistingLemmaTargets: explicitTargets.flatMap(
						(target) =>
							target
								? [{ lemma: lemmaValue(target.canonical) }]
								: [],
					),
					exactPendingRelations: pending,
					pendingRelationsMatchingProposedLemma:
						matchingPending.flatMap((record) => {
							try {
								const descriptor = pendingShadowDescriptor(
									record.record,
								);
								return descriptor.language ===
									args.proposedLemma.language &&
									descriptor.canonicalForm ===
										args.proposedLemma.canonicalForm &&
									descriptor.family ===
										args.proposedLemma.family &&
									descriptor.kind === args.proposedLemma.kind
									? [
											requireRecord(
												record.record,
												"Pending Semantic Relation record",
											),
										]
									: [];
							} catch {
								return [];
							}
						}),
					relationLemmas: inventory.lemmas,
					relationReadings: inventory.readings,
				};
			}
		}
	},
});

export const getDumdictRelationsCleanupInfo = internalQuery({
	args: { canonicalForm: v.string() },
	returns: v.any(),
	handler: async (ctx, { canonicalForm }) => {
		const [revision, lemmas, pending] = await Promise.all([
			currentRevision(ctx),
			ctx.db
				.query("lemmas")
				.withIndex("by_language_and_canonical_form", (q) =>
					q.eq("language", "de").eq("canonicalForm", canonicalForm),
				)
				.take(MAX_CLEANUP_CANDIDATE_LEMMAS + 1),
			ctx.db
				.query("pendingSemanticRelations")
				.withIndex("by_target_canonical_form", (q) =>
					q.eq("targetCanonicalForm", canonicalForm),
				)
				.take(MAX_PENDING_RELATIONS_PER_SLICE + 1),
		]);
		if (lemmas.length > MAX_CLEANUP_CANDIDATE_LEMMAS) {
			throw new Error(
				`Relations cleanup supports at most ${MAX_CLEANUP_CANDIDATE_LEMMAS} candidate Lemmas.`,
			);
		}
		if (pending.length > MAX_PENDING_RELATIONS_PER_SLICE) {
			throw new Error(
				`Relations cleanup supports at most ${MAX_PENDING_RELATIONS_PER_SLICE} pending records.`,
			);
		}
		const dictionaryLemmas = await Promise.all(
			lemmas.map((lemma) =>
				ctx.db
					.query("dictionaryLemmas")
					.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
					.unique(),
			),
		);
		return {
			revision,
			canonicalForm,
			candidateLemmas: lemmas.flatMap((lemma, index) =>
				dictionaryLemmas[index] ? [{ lemma: lemmaValue(lemma) }] : [],
			),
			pendingRelations: pending.map((record) =>
				requireRecord(
					record.record,
					"Pending Semantic Relation record",
				),
			),
		};
	},
});

export const loadDumdictCleanupRelationsContext = internalQuery({
	args: {
		locatorKeys: v.array(v.string()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		assertPlanBudget(args.locatorKeys.length, "Relations-cleanup context");
		const locatorKeys = uniqueBoundedKeys(
			args.locatorKeys,
			"Relations-cleanup locator loading",
		);
		const [revision, pending, inventory] = await Promise.all([
			currentRevision(ctx),
			Promise.all(
				locatorKeys.map((locatorKey) =>
					ctx.db
						.query("pendingSemanticRelations")
						.withIndex("by_locator_key", (q) =>
							q.eq("locatorKey", locatorKey),
						)
						.unique(),
				),
			),
			loadRelationInventory(ctx),
		]);
		return {
			revision,
			pendingRelations: pending.flatMap((record) =>
				record
					? [
							requireRecord(
								record.record,
								"Pending Semantic Relation record",
							),
						]
					: [],
			),
			relationLemmas: inventory.lemmas,
			relationReadings: inventory.readings,
		};
	},
});

export const loadDumdictReadingForPatch = internalQuery({
	args: { readingKey: v.string() },
	returns: v.any(),
	handler: async (ctx, { readingKey }) => {
		const [revision, reading] = await Promise.all([
			currentRevision(ctx),
			findReadingByKey(ctx, readingKey),
		]);
		return {
			revision,
			...(reading ? { reading: reading.entry } : {}),
		};
	},
});
