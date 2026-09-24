import type * as Dumling from "dumling/types";

import type * as Effect from "effect/Effect";
import type {
	CommitChangesRequest,
	CommitChangesResult,
} from "../domain-types";
import type { DumdictStorageFailure } from "../public/results";
import type {
	CleanupRelationsSlice,
	FindStoredReadingsStorageRequest,
	GetInfoForRelationsCleanupStorageRequest,
	LoadCleanupRelationsContextRequest,
	LoadReadingEntryContextRequest,
	LoadReadingForPatchRequest,
	ReadingEntryContext,
	ReadingPatchSlice,
	RelationsCleanupInfoSlice,
	StoredReadingsSlice,
} from "./slices";

/**
 * Host persistence boundary for Dumdict workflows.
 *
 * @remarks Reads return the requested operation slice with its store revision.
 * `commitChanges` must apply every ordered direct change atomically or report a
 * conflict; adapters do not infer relation views or resolve Unit Shadows.
 */
export type DumdictStoragePort<L extends Dumling.Language> = {
	findStoredReadings(
		request: FindStoredReadingsStorageRequest<L>,
	): Effect.Effect<StoredReadingsSlice<L>, DumdictStorageFailure>;

	getInfoForRelationsCleanup(
		request: GetInfoForRelationsCleanupStorageRequest<L>,
	): Effect.Effect<RelationsCleanupInfoSlice<L>, DumdictStorageFailure>;

	loadReadingForPatch(
		request: LoadReadingForPatchRequest<L>,
	): Effect.Effect<ReadingPatchSlice<L>, DumdictStorageFailure>;

	loadReadingEntryContext(
		request: LoadReadingEntryContextRequest<L>,
	): Effect.Effect<ReadingEntryContext<L>, DumdictStorageFailure>;

	loadCleanupRelationsContext(
		request: LoadCleanupRelationsContextRequest<L>,
	): Effect.Effect<CleanupRelationsSlice<L>, DumdictStorageFailure>;

	commitChanges: (
		request: CommitChangesRequest<L>,
	) => Effect.Effect<CommitChangesResult, DumdictStorageFailure>;
};

export type CreateDumdictServiceOptions<L extends Dumling.Language> = {
	language: L;
	storage: DumdictStoragePort<L>;
};
