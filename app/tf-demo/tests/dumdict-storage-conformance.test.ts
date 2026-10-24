import { afterEach, beforeEach, jest } from "bun:test";
import type {
	CleanupRelationsSlice,
	ReadingEntryContext,
	ReevaluateShadowsSlice,
} from "dumdict/planning";
import {
	type ConformanceStorage,
	describeStorageConformance,
} from "dumdict/testing";
import type * as Dumling from "dumling/types";
import type { MutationCtx } from "../convex/_generated/server";
import { pendingLocatorIndexKey } from "../convex/model/dumdictPendingIndexes";
import {
	applyDumdictPlanInTransaction,
	loadCleanupRelationsSlice,
	loadOccurrenceSlice,
	loadReadingEntryContextSlice,
	loadReevaluateShadowsSlice,
	loadRekeySurfacesSlice,
	readingEntryContextArgs,
} from "../convex/model/dumdictTransaction";
import { lemmaIdentityKey } from "../server/linguisticIdentity";
import { createTestConvex } from "./support/convex";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

/**
 * The Shared Demo Dictionary's Convex store under Dumdict's storage
 * conformance suite: each commit is one transaction, as a host mutation
 * applies a plan, and each read is the slice a planner plans from.
 */
function convexStorage(): ConformanceStorage {
	const t = createTestConvex();
	return {
		commitChanges: (request) =>
			t.run((ctx) => applyDumdictPlanInTransaction(ctx, request)),
		loadReadingEntryContext: (request) =>
			t.run((ctx) =>
				loadReadingEntryContextSlice(
					ctx,
					readingEntryContextArgs(request),
				),
			) as Promise<ReadingEntryContext<"de">>,
		loadCleanupRelationsContext: ({ resolutions }) =>
			t.run((ctx) =>
				loadCleanupRelationsSlice(
					ctx,
					resolutions.map(({ locator }) =>
						pendingLocatorIndexKey(locator),
					),
				),
			) as Promise<CleanupRelationsSlice<"de">>,
		loadReevaluateShadowsContext: (request) =>
			t.run((ctx) => loadReevaluateShadowsSlice(ctx, request)) as Promise<
				ReevaluateShadowsSlice<"de">
			>,
		loadOccurrenceSlice: async () => loadOccurrenceSlice(),
		loadRekeySurfacesSlice: (request) =>
			t.run((ctx) => loadRekeySurfacesSlice(ctx, request)),
		removeLemma: (lemma) =>
			t.run((ctx) => removeDictionaryLemma(ctx, lemma)),
	};
}

/**
 * Takes a Lemma out of the Shared Demo Dictionary as a host removal does:
 * its dictionary entry, its Readings with their entries, outgoing edges and
 * pending records, and its owned Surfaces. Its canonical row and the edges
 * other Readings hold on it stay, as stored claims outlive the removal until
 * a re-evaluation moves them.
 */
async function removeDictionaryLemma(
	ctx: MutationCtx,
	lemma: Dumling.Lemma<"de">,
): Promise<void> {
	const canonical = await ctx.db
		.query("lemmas")
		.withIndex("by_lemma_key", (q) =>
			q.eq("lemmaKey", lemmaIdentityKey(lemma)),
		)
		.unique();
	if (!canonical) return;
	const membership = await ctx.db
		.query("dictionaryLemmas")
		.withIndex("by_lemma_id", (q) => q.eq("lemmaId", canonical._id))
		.unique();
	if (membership) await ctx.db.delete(membership._id);
	const readings = await ctx.db
		.query("readings")
		.withIndex("by_lemma_id", (q) => q.eq("lemmaId", canonical._id))
		.collect();
	for (const reading of readings) {
		const [entries, edges, pending] = await Promise.all([
			ctx.db
				.query("readingEntries")
				.withIndex("by_reading_id", (q) =>
					q.eq("readingId", reading._id),
				)
				.collect(),
			ctx.db
				.query("semanticRelationEdges")
				.withIndex(
					"by_source_reading_id_and_relation_and_target_lemma_id",
					(q) => q.eq("sourceReadingId", reading._id),
				)
				.collect(),
			ctx.db
				.query("pendingSemanticRelations")
				.withIndex("by_source_reading_key", (q) =>
					q.eq("sourceReadingKey", reading.readingKey),
				)
				.collect(),
		]);
		for (const row of [...entries, ...edges, ...pending])
			await ctx.db.delete(row._id);
		await ctx.db.delete(reading._id);
	}
	const surfaces = await ctx.db
		.query("surfaces")
		.withIndex("by_lemma_id", (q) => q.eq("lemmaId", canonical._id))
		.collect();
	for (const surface of surfaces) {
		const owned = await ctx.db
			.query("ownedSurfaces")
			.withIndex("by_surface_id", (q) => q.eq("surfaceId", surface._id))
			.unique();
		if (owned) await ctx.db.delete(owned._id);
	}
}

// tf-demo keeps occurrences and their cleanup in its host graph (tf-demo ADR
// 0001) and stores no Lemma Paradigms until texteater#1232. Its Convex
// transaction's own reads guard a commit, so its revision is one constant
// (convex/dumdictStorage/storage.ts).
describeStorageConformance("The Convex dictionary store", convexStorage, {
	attestationLinks: false,
	paradigms: false,
	revisions: false,
});
