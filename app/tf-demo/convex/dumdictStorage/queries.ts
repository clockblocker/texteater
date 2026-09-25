import { v } from "convex/values";

import { internalQuery } from "../_generated/server";
import { lemmaValue, readingValue } from "../model/occurrenceAttestations";
import {
	type AnyRecord,
	requireRecord,
	requireString,
} from "../model/readingKnowledge";
import { pendingShadowDescriptor } from "../model/shadows";
import { readingValueValidator } from "../model/validators";
import type { ReadingEntryContextArgs } from "./contextRequest";
import {
	assertPlanBudget,
	DICTIONARY_REVISION,
	findLemmaByKey,
	findReadingByKey,
	findSurface,
	loadRelationNeighbourhood,
	MAX_PENDING_RELATIONS_PER_SLICE,
	MAX_READING_CANDIDATES,
	pendingLocatorKey,
	type ServerCtx,
	uniqueBoundedKeys,
} from "./storage";

/**
 * The Readings the Shared Demo Dictionary stores for a Lemma: the one
 * dictionary read a click makes outside the commit transaction.
 */
export const findStoredReadings = internalQuery({
	args: { lemmaKey: v.string() },
	returns: v.array(readingValueValidator),
	handler: async (ctx, { lemmaKey }) => {
		const lemma = await ctx.db
			.query("lemmas")
			.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", lemmaKey))
			.unique();
		if (!lemma) return [];
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
		if (!dictionaryLemma) return [];
		if (readings.length > MAX_READING_CANDIDATES) {
			throw new Error(
				`Stored Reading lookup supports at most ${MAX_READING_CANDIDATES} candidates.`,
			);
		}
		const entries = await Promise.all(
			readings.map((reading) =>
				ctx.db
					.query("readingEntries")
					.withIndex("by_reading_id", (q) =>
						q.eq("readingId", reading._id),
					)
					.unique(),
			),
		);
		return readings.flatMap((reading, index) =>
			entries[index] ? [readingValue(reading, lemma)] : [],
		);
	},
});

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
 * The changes a generated-Knowledge context is sized for: the Reading's own
 * patch and one per pending proposal.
 */
export function generatedKnowledgeContextChanges(
	args: Extract<
		ReadingEntryContextArgs,
		{ intent: "applyGeneratedKnowledge" }
	>,
): number {
	return 1 + args.pendingLocatorKeys.length;
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
				generatedKnowledgeContextChanges(args),
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
