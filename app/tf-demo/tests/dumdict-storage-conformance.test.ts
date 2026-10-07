import { afterEach, beforeEach, jest } from "bun:test";
import type { ReadingEntryContext } from "dumdict/planning";
import {
	type ConformanceStorage,
	describeStorageConformance,
} from "dumdict/testing";
import * as Effect from "effect/Effect";
import {
	applyDumdictPlanInTransaction,
	loadReadingEntryContextSlice,
	readingEntryContextArgs,
} from "../convex/model/dumdictTransaction";
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
			Effect.promise(() =>
				t.run((ctx) => applyDumdictPlanInTransaction(ctx, request)),
			),
		loadReadingEntryContext: (request) =>
			Effect.promise(
				() =>
					t.run((ctx) =>
						loadReadingEntryContextSlice(
							ctx,
							readingEntryContextArgs(request),
						),
					) as Promise<ReadingEntryContext<"de">>,
			),
	};
}

// tf-demo keeps occurrence Attestations in its host graph (tf-demo ADR 0001).
describeStorageConformance("The Convex dictionary store", convexStorage, {
	readingAttestations: false,
});
