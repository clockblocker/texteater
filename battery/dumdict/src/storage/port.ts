import type { SupportedLanguage } from "dumling/types";
import type { CommitChangesRequest, CommitChangesResult } from "./commit";
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

export type DumdictStoragePort<L extends SupportedLanguage> = {
	findStoredReadings(
		request: FindStoredReadingsStorageRequest<L>,
	): Promise<StoredReadingsSlice<L>>;

	getInfoForRelationsCleanup(
		request: GetInfoForRelationsCleanupStorageRequest<L>,
	): Promise<RelationsCleanupInfoSlice<L>>;

	loadReadingForPatch(
		request: LoadReadingForPatchRequest<L>,
	): Promise<ReadingPatchSlice<L>>;

	loadReadingEntryContext(
		request: LoadReadingEntryContextRequest<L>,
	): Promise<ReadingEntryContext<L>>;

	loadCleanupRelationsContext(
		request: LoadCleanupRelationsContextRequest<L>,
	): Promise<CleanupRelationsSlice<L>>;

	commitChanges(
		request: CommitChangesRequest<L>,
	): Promise<CommitChangesResult>;
};

export type DumdictServiceConfig<L extends SupportedLanguage> = {
	language?: L;
};

export type CreateDumdictServiceOptions<L extends SupportedLanguage> = {
	language: L;
	storage: DumdictStoragePort<L>;
	config?: DumdictServiceConfig<L>;
};
