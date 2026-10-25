import { v } from "convex/values";
import { reevaluatedPendingEntryIds, unitShadowOf } from "dumdict/pending";
import type {
	OccurrenceSlice,
	ReevaluateShadowsRequest,
	RekeySurfacesSlice,
	RekeySurfacesSliceRequest,
	StoredSurfaceNote,
} from "dumdict/planning";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { foldedCanonicalForm } from "../../server/linguisticIdentity";

import { internalQuery } from "../_generated/server";
import { lemmaValue, readingValue } from "../model/occurrenceAttestations";
import {
	type AnyRecord,
	requireRecord,
	requireString,
} from "../model/readingKnowledge";
import {
	parsePendingShadowDescriptor,
	pendingShadowDescriptor,
	warnMalformedStoredRow,
} from "../model/shadows";
import { readingValueValidator } from "../model/validators";
import { loadReflexiveSlot } from "../modules/notes/readingReflexive";
import type { ReadingEntryContextArgs } from "./contextRequest";
import {
	assertPlanBudget,
	DICTIONARY_REVISION,
	findCanonicalLemma,
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
 * The Readings the Shared Demo Dictionary stores for a Lemma. A click reads
 * them before it resolves its Reading, and the commit reads them again to
 * refuse a stale New (ADR 0031).
 */
export async function storedReadingsOf(ctx: ServerCtx, lemmaKey: string) {
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
}

/**
 * The Readings the Shared Demo Dictionary stores for a Lemma: the one
 * dictionary read a click makes outside the commit transaction.
 */
export const findStoredReadings = internalQuery({
	args: { lemmaKey: v.string() },
	returns: v.array(readingValueValidator),
	handler: (ctx, { lemmaKey }) => storedReadingsOf(ctx, lemmaKey),
});

/**
 * The Emoji Descriptions of a Lemma's stored Readings whose accumulated
 * Knowledge gives an Optional Reflexive Slot, as `(sich) ausruhen` has (ADR
 * 0052). A click with a lexical reflexive offers them beside the 🪞
 * Readings; a Reading with no Knowledge yet is not among them.
 */
export const findOptionallyReflexiveReadings = internalQuery({
	args: { lemmaKey: v.string() },
	returns: v.array(v.string()),
	handler: async (ctx, { lemmaKey }) => {
		const lemma = await ctx.db
			.query("lemmas")
			.withIndex("by_lemma_key", (q) => q.eq("lemmaKey", lemmaKey))
			.unique();
		if (!lemma) return [];
		const readings = await ctx.db
			.query("readings")
			.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
			.take(MAX_READING_CANDIDATES);
		const slots = await Promise.all(
			readings.map(({ readingKey }) =>
				loadReflexiveSlot(ctx, readingKey),
			),
		);
		return readings.flatMap(({ emojiDescription }, index) =>
			emojiDescription !== undefined &&
			slots[index]?.status === "Optional"
				? [emojiDescription]
				: [],
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

/**
 * Every stored Pending Semantic Relation, resolved or not, whose Shadow has
 * this Shadow's language, Family, Kind and folded Canonical Form: the
 * records a Lemma with that description matches (system ADR 0011).
 */
async function loadPendingMatchingShadow(
	ctx: ServerCtx,
	shadow: {
		readonly language: Dumling.Language;
		readonly family: string;
		readonly kind: string;
		readonly canonicalForm: string;
	},
) {
	const rows = await ctx.db
		.query("pendingSemanticRelations")
		.withIndex("by_target_folded_canonical_form", (q) =>
			q.eq("targetFoldedCanonicalForm", foldedCanonicalForm(shadow)),
		)
		.take(MAX_PENDING_RELATIONS_PER_SLICE + 1);
	if (rows.length > MAX_PENDING_RELATIONS_PER_SLICE)
		throw new Error(
			`A pending-relation slice supports at most ${MAX_PENDING_RELATIONS_PER_SLICE} matching records.`,
		);
	return rows.flatMap((row) => {
		const parsed = parsePendingShadowDescriptor(row.record);
		if (!parsed.ok) {
			warnMalformedStoredRow(
				"pendingSemanticRelations",
				row._id,
				parsed.error,
			);
			return [];
		}
		const descriptor = parsed.value;
		return descriptor.language === shadow.language &&
			foldedCanonicalForm(descriptor) === foldedCanonicalForm(shadow) &&
			descriptor.family === shadow.family &&
			descriptor.kind === shadow.kind
			? [requireRecord(row.record, "Pending Semantic Relation record")]
			: [];
	});
}

/**
 * The relation inventory re-evaluating these stored records reads: their
 * source Readings with what those claim, and every dictionary Lemma their
 * Shadows' Canonical Forms could match.
 */
function loadShadowNeighbourhood(
	ctx: ServerCtx,
	records: readonly AnyRecord[],
	sourceLemmaKeys: readonly string[] = [],
) {
	return loadRelationNeighbourhood(ctx, {
		...pendingRelationSeeds(records),
		sourceLemmaKeys,
	});
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
			const [lemma, reading, pendingRelationsMatchingProposedLemma] =
				await Promise.all([
					findLemmaByKey(ctx, args.lemmaKey),
					findReadingByKey(ctx, args.readingKey),
					loadPendingMatchingShadow(ctx, args.proposedLemma),
				]);
			// Creating the Lemma re-evaluates the Shadows it matches.
			const inventory = await loadShadowNeighbourhood(
				ctx,
				pendingRelationsMatchingProposedLemma,
				[args.lemmaKey],
			);
			return {
				intent: args.intent,
				revision: DICTIONARY_REVISION,
				...existingLemmaOf(lemma),
				...(reading ? { existingReading: reading.entry } : {}),
				pendingRelationsMatchingProposedLemma,
				relationLemmas: inventory.lemmas,
				relationReadings: inventory.readings,
			};
		}
		case "ensureOwnedSurface":
		case "recordOccurrence": {
			const [lemma, reading, surface] = await Promise.all([
				findLemmaByKey(ctx, args.lemmaKey),
				findReadingByKey(ctx, args.readingKey),
				findSurface(ctx, args.surfaceKey),
			]);
			return {
				intent: args.intent,
				revision: DICTIONARY_REVISION,
				...existingLemmaOf(lemma),
				...(reading ? { existingReading: reading.entry } : {}),
				existingOwnedSurfaces: surface ? [surface.entry] : [],
				// tf-demo keeps occurrences in its host graph (tf-demo ADR 0001).
				...(args.intent === "recordOccurrence"
					? { attestationLinksWithRefs: [] }
					: {}),
			};
		}
		case "applyGeneratedKnowledge": {
			assertPlanBudget(
				generatedKnowledgeContextChanges(args),
				"Generated-Knowledge context",
			);
			const [lemma, lemmaReadings, reading, pending, inventory] =
				await Promise.all([
					findLemmaByKey(ctx, args.lemmaKey),
					storedReadingsOf(ctx, args.lemmaKey),
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
				...existingLemmaOf(lemma),
				...(reading ? { existingReading: reading.entry } : {}),
				lemmaReadings,
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
				lemmaReadings,
				reading,
				surfaces,
				explicitTargets,
				pending,
				pendingRelationsMatchingProposedLemma,
			] = await Promise.all([
				findLemmaByKey(ctx, args.lemmaKey),
				storedReadingsOf(ctx, args.lemmaKey),
				findReadingByKey(ctx, args.readingKey),
				Promise.all(surfaceKeys.map((key) => findSurface(ctx, key))),
				Promise.all(
					explicitLemmaTargetKeys.map((key) =>
						findLemmaByKey(ctx, key),
					),
				),
				loadExactPendingRecords(ctx, args.pendingLocatorKeys),
				loadPendingMatchingShadow(ctx, args.proposedLemma),
			]);
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
				...existingLemmaOf(lemma),
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
				lemmaReadings,
				// tf-demo keeps occurrences in its host graph (tf-demo ADR 0001).
				attestationLinksWithRefs: [],
			};
		}
	}
}

/** A stored Lemma as its context's `existingLemma`; tf-demo stores no Paradigm. */
function existingLemmaOf(lemma: Awaited<ReturnType<typeof findLemmaByKey>>) {
	return lemma
		? { existingLemma: { lemma: lemmaValue(lemma.canonical) } }
		: {};
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

/**
 * Loads the stored records a `reevaluateShadows` request names, resolved or
 * not, and the neighbourhood their re-evaluation reads.
 */
export async function loadReevaluateShadowsSlice(
	ctx: ServerCtx,
	request: Omit<ReevaluateShadowsRequest<"de">, "baseRevision">,
) {
	const shadows = (request.removedLemmas ?? []).map((lemma) =>
		unitShadowOf(lemma),
	);
	const ids = new Set<string>(reevaluatedPendingEntryIds(request));
	const loaded = await Promise.all(
		shadows.map((shadow) => loadPendingMatchingShadow(ctx, shadow)),
	);
	const byLocator = new Map<string, AnyRecord>();
	for (const record of loaded.flat())
		if (
			ids.has(
				requireString(
					requireRecord(record.locator, "Pending locator")
						.targetPendingId,
					"targetPendingId",
				),
			)
		)
			byLocator.set(pendingLocatorKey(record), record);
	const pendingRelations = [...byLocator.values()];
	const removed = request.removedLemmas ?? [];
	const seeds = pendingRelationSeeds(pendingRelations);
	const inventory = await loadRelationNeighbourhood(ctx, {
		sourceReadingKeys: [
			...seeds.sourceReadingKeys,
			...(await readingsClaimingRemoved(ctx, removed)),
		],
		// The Lemmas a removed Lemma's Shadow may now resolve to.
		targetCanonicalForms: [
			...seeds.targetCanonicalForms,
			...removed.map(({ canonicalForm }) => canonicalForm),
		],
	});
	return {
		revision: DICTIONARY_REVISION,
		pendingRelations,
		relationLemmas: inventory.lemmas,
		relationReadings: inventory.readings,
	};
}

/**
 * The keys of the Readings that claim a removed Lemma or one of its
 * Readings. The re-evaluation moves those claims in its plan (system ADR
 * 0011), so it loads them with what they claim.
 */
async function readingsClaimingRemoved(
	ctx: ServerCtx,
	lemmas: readonly Dumling.Lemma<"de">[],
): Promise<string[]> {
	const keys = new Set<string>();
	for (const lemma of lemmas) {
		// The planner refuses a malformed removed Lemma as an invalid request.
		if (!parseUnit(lemma).success) continue;
		const canonical = await findCanonicalLemma(ctx, lemma);
		if (!canonical) continue;
		const readings = await ctx.db
			.query("readings")
			.withIndex("by_lemma_id", (q) => q.eq("lemmaId", canonical._id))
			.take(MAX_READING_CANDIDATES + 1);
		const edges = (
			await Promise.all([
				ctx.db
					.query("semanticRelationEdges")
					.withIndex("by_target_lemma_id", (q) =>
						q.eq("targetLemmaId", canonical._id),
					)
					.take(MAX_PENDING_RELATIONS_PER_SLICE + 1),
				...readings.map((reading) =>
					ctx.db
						.query("semanticRelationEdges")
						.withIndex("by_target_reading_id", (q) =>
							q.eq("targetReadingId", reading._id),
						)
						.take(MAX_PENDING_RELATIONS_PER_SLICE + 1),
				),
			])
		).flat();
		if (
			readings.length > MAX_READING_CANDIDATES ||
			edges.length > MAX_PENDING_RELATIONS_PER_SLICE
		)
			throw new Error(
				`A removed Lemma supports at most ${MAX_PENDING_RELATIONS_PER_SLICE} claims on it.`,
			);
		const sources = await Promise.all(
			edges.map(({ sourceReadingId }) => ctx.db.get(sourceReadingId)),
		);
		for (const source of sources)
			if (source && source.lemmaId !== canonical._id)
				keys.add(source.readingKey);
	}
	return [...keys];
}

/**
 * The slice `removeOccurrence` and `reconcileAttestationLinks` plan from.
 * tf-demo keeps occurrences in its host graph (tf-demo ADR 0001), so no
 * stored Lemma holds an Attestation Link with any ref.
 */
export function loadOccurrenceSlice(): OccurrenceSlice<"de"> {
	return {
		revision: DICTIONARY_REVISION,
		lemmas: [],
		claimingReadings: [],
		pendingRelationsMatchingLemmas: [],
	};
}

/**
 * The slice `rekeySurfaces` plans from: each stored owned Surface with a
 * requested id, without its Surface. No Reading Entry holds a link.
 */
export async function loadRekeySurfacesSlice(
	ctx: ServerCtx,
	request: RekeySurfacesSliceRequest<"de">,
): Promise<RekeySurfacesSlice<"de">> {
	const surfaces = await Promise.all(
		uniqueBoundedKeys(request.surfaceIds, "Re-keyed Surface loading").map(
			(key) => findSurface(ctx, key),
		),
	);
	return {
		revision: DICTIONARY_REVISION,
		surfaces: surfaces.flatMap((stored) => {
			if (!stored) return [];
			const { surface: _surface, ...note } = stored.entry;
			// The row's record is untyped; the planner's slice validation
			// checks it as a stored Surface note.
			return [note as unknown as StoredSurfaceNote<"de">];
		}),
		readings: [],
	};
}
