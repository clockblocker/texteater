import { v } from "convex/values";

import { internalQuery } from "../_generated/server";
import { lemmaValue } from "../model/occurrenceAttestations";
import {
	type AnyRecord,
	requireRecord,
	requireString,
} from "../model/readingKnowledge";
import { pendingShadowDescriptor } from "../model/shadows";
import { lemmaValueValidator } from "../model/validators";
import type { ReadingEntryContextArgs } from "./contextRequest";
import {
	assertPlanBudget,
	DICTIONARY_REVISION,
	dictionaryLemmasWithCanonicalForm,
	findLemmaByKey,
	findReadingByKey,
	findSurface,
	loadReading,
	loadRelationNeighbourhood,
	MAX_PENDING_RELATIONS_PER_SLICE,
	MAX_READING_CANDIDATES,
	pendingLocatorKey,
	type ServerCtx,
	uniqueBoundedKeys,
} from "./storage";

export const findDumdictStoredReadings = internalQuery({
	args: { lemmaKey: v.string() },
	returns: v.object({ revision: v.string(), candidates: v.array(v.any()) }),
	handler: async (ctx, { lemmaKey }) => {
		const lemma = await ctx.db
			.query("lemmas")
			.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", lemmaKey))
			.unique();
		if (!lemma) return { revision: DICTIONARY_REVISION, candidates: [] };
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
		if (!dictionaryLemma)
			return { revision: DICTIONARY_REVISION, candidates: [] };
		if (readings.length > MAX_READING_CANDIDATES) {
			throw new Error(
				`Stored Reading lookup supports at most ${MAX_READING_CANDIDATES} candidates.`,
			);
		}
		const entries = await Promise.all(
			readings.map((reading) => loadReading(ctx, reading)),
		);
		return {
			revision: DICTIONARY_REVISION,
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
		pendingTargetCanonicalForms: v.array(v.string()),
	}),
	v.object({
		intent: v.literal("applyGeneratedKnowledge"),
		readingKey: v.string(),
		pendingLocatorKeys: v.array(v.string()),
		pendingTargetCanonicalForms: v.array(v.string()),
		relationTargetLemmaKeys: v.array(v.string()),
		relationTargetReadingKeys: v.array(v.string()),
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

/** The Readings pending relations start from and the Shadow forms they target. */
function pendingRelationSeeds(records: readonly AnyRecord[]) {
	return {
		sourceReadingKeys: records.map((record) =>
			requireString(
				requireRecord(record.locator, "Pending locator")
					.sourceReadingKey,
				"sourceReadingKey",
			),
		),
		targetCanonicalForms: records.map(
			(record) => pendingShadowDescriptor(record).canonicalForm,
		),
	};
}

async function loadExactPendingRecords(
	ctx: ServerCtx,
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

/**
 * Loads the operation-shaped Reading Entry context for one dictionary intent.
 *
 * The internal query below hands this slice to the action-side adapter; the
 * mutation-side adapter reads it directly inside its own transaction.
 */
export async function loadReadingEntryContextSlice(
	ctx: ServerCtx,
	args: ReadingEntryContextArgs,
) {
	switch (args.intent) {
		case "ensureReadingEntry": {
			const [lemma, reading] = await Promise.all([
				findLemmaByKey(ctx, args.lemmaKey),
				findReadingByKey(ctx, args.readingKey),
			]);
			return {
				intent: args.intent,
				revision: DICTIONARY_REVISION,
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
			const [lemma, reading, surface] = await Promise.all([
				findLemmaByKey(ctx, args.lemmaKey),
				findReadingByKey(ctx, args.readingKey),
				findSurface(ctx, args.surfaceKey),
			]);
			return {
				intent: args.intent,
				revision: DICTIONARY_REVISION,
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
			const [reading, pending, inventory] = await Promise.all([
				findReadingByKey(ctx, args.readingKey),
				loadExactPendingRecords(ctx, args.pendingLocatorKeys),
				loadRelationNeighbourhood(ctx, {
					sourceReadingKeys: [args.readingKey],
					targetReadingKeys: args.relationTargetReadingKeys,
					targetLemmaKeys: args.relationTargetLemmaKeys,
					targetCanonicalForms: args.pendingTargetCanonicalForms,
				}),
			]);
			return {
				intent: args.intent,
				revision: DICTIONARY_REVISION,
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
				lemma,
				reading,
				surfaces,
				explicitTargets,
				pending,
				matchingPending,
			] = await Promise.all([
				findLemmaByKey(ctx, args.lemmaKey),
				findReadingByKey(ctx, args.readingKey),
				Promise.all(surfaceKeys.map((key) => findSurface(ctx, key))),
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
			]);
			if (matchingPending.length > MAX_PENDING_RELATIONS_PER_SLICE)
				throw new Error(
					`A pending-relation slice supports at most ${MAX_PENDING_RELATIONS_PER_SLICE} matching records.`,
				);
			const pendingRelationsMatchingProposedLemma =
				matchingPending.flatMap((record) => {
					try {
						const descriptor = pendingShadowDescriptor(
							record.record,
						);
						return descriptor.language ===
							args.proposedLemma.language &&
							descriptor.canonicalForm ===
								args.proposedLemma.canonicalForm &&
							descriptor.family === args.proposedLemma.family &&
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
				});
			// A click names no relations, so it only reads a neighbourhood
			// when pending relations resolve to its new Lemma.
			const matching = pendingRelationSeeds(
				pendingRelationsMatchingProposedLemma,
			);
			const inventory = await loadRelationNeighbourhood(ctx, {
				sourceReadingKeys: matching.sourceReadingKeys,
				sourceLemmaKeys: [args.lemmaKey],
				targetLemmaKeys: args.explicitLemmaTargetKeys,
				targetCanonicalForms: [
					...args.pendingTargetCanonicalForms,
					...matching.targetCanonicalForms,
				],
			});
			return {
				intent: args.intent,
				revision: DICTIONARY_REVISION,
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
						target ? [{ lemma: lemmaValue(target.canonical) }] : [],
				),
				exactPendingRelations: pending,
				pendingRelationsMatchingProposedLemma,
				relationLemmas: inventory.lemmas,
				relationReadings: inventory.readings,
			};
		}
	}
}

export const loadDumdictReadingEntryContext = internalQuery({
	args: { request: readingEntryContextArgsValidator },
	returns: v.any(),
	handler: (ctx, { request }) => loadReadingEntryContextSlice(ctx, request),
});

export const getDumdictRelationsCleanupInfo = internalQuery({
	args: { canonicalForm: v.string() },
	returns: v.any(),
	handler: async (ctx, { canonicalForm }) => {
		const [lemmas, pending] = await Promise.all([
			dictionaryLemmasWithCanonicalForm(ctx, canonicalForm),
			ctx.db
				.query("pendingSemanticRelations")
				.withIndex("by_target_canonical_form", (q) =>
					q.eq("targetCanonicalForm", canonicalForm),
				)
				.take(MAX_PENDING_RELATIONS_PER_SLICE + 1),
		]);
		if (pending.length > MAX_PENDING_RELATIONS_PER_SLICE) {
			throw new Error(
				`Relations cleanup supports at most ${MAX_PENDING_RELATIONS_PER_SLICE} pending records.`,
			);
		}
		return {
			revision: DICTIONARY_REVISION,
			canonicalForm,
			candidateLemmas: lemmas.map((lemma) => ({
				lemma: lemmaValue(lemma),
			})),
			pendingRelations: pending.map((record) =>
				requireRecord(
					record.record,
					"Pending Semantic Relation record",
				),
			),
		};
	},
});

/** Loads the exact pending relations one cleanup resolves and their neighbourhood. */
export async function loadCleanupRelationsSlice(
	ctx: ServerCtx,
	rawLocatorKeys: readonly string[],
) {
	assertPlanBudget(rawLocatorKeys.length, "Relations-cleanup context");
	const locatorKeys = uniqueBoundedKeys(
		rawLocatorKeys,
		"Relations-cleanup locator loading",
	);
	const pending = await Promise.all(
		locatorKeys.map((locatorKey) =>
			ctx.db
				.query("pendingSemanticRelations")
				.withIndex("by_locator_key", (q) =>
					q.eq("locatorKey", locatorKey),
				)
				.unique(),
		),
	);
	const pendingRelations = pending.flatMap((record) =>
		record
			? [requireRecord(record.record, "Pending Semantic Relation record")]
			: [],
	);
	const inventory = await loadRelationNeighbourhood(
		ctx,
		pendingRelationSeeds(pendingRelations),
	);
	return {
		revision: DICTIONARY_REVISION,
		pendingRelations,
		relationLemmas: inventory.lemmas,
		relationReadings: inventory.readings,
	};
}

export const loadDumdictCleanupRelationsContext = internalQuery({
	args: { locatorKeys: v.array(v.string()) },
	returns: v.any(),
	handler: (ctx, { locatorKeys }) =>
		loadCleanupRelationsSlice(ctx, locatorKeys),
});

export const loadDumdictReadingForPatch = internalQuery({
	args: { readingKey: v.string() },
	returns: v.any(),
	handler: async (ctx, { readingKey }) => {
		const reading = await findReadingByKey(ctx, readingKey);
		return {
			revision: DICTIONARY_REVISION,
			...(reading ? { reading: reading.entry } : {}),
		};
	},
});
