import type { SupportedLanguage } from "../dumling";
import type { CommitChangesRequest, CommitChangesResult } from "./commit";
import type {
	CleanupRelationsSlice,
	FindStoredReadingsStorageRequest,
	GetInfoForRelationsCleanupStorageRequest,
	LoadCleanupRelationsContextRequest,
	LoadNewNoteContextRequest,
	LoadReadingForPatchRequest,
	NewNoteSlice,
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

	loadNewNoteContext(
		request: LoadNewNoteContextRequest<L>,
	): Promise<NewNoteSlice<L>>;

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
