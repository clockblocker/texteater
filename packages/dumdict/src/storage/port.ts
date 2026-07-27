import type { SupportedLanguage } from "../dumling";
import type { CommitChangesRequest, CommitChangesResult } from "./commit";
import type {
	CleanupRelationsSlice,
	FindStoredLemmaSensesStorageRequest,
	GetInfoForRelationsCleanupStorageRequest,
	LemmaPatchSlice,
	LoadCleanupRelationsContextRequest,
	LoadLemmaForPatchRequest,
	LoadNewNoteContextRequest,
	NewNoteSlice,
	RelationsCleanupInfoSlice,
	StoredLemmaSensesSlice,
} from "./slices";

export type DumdictStoragePort<L extends SupportedLanguage> = {
	findStoredLemmaSenses(
		request: FindStoredLemmaSensesStorageRequest<L>,
	): Promise<StoredLemmaSensesSlice<L>>;

	getInfoForRelationsCleanup(
		request: GetInfoForRelationsCleanupStorageRequest<L>,
	): Promise<RelationsCleanupInfoSlice<L>>;

	loadLemmaForPatch(
		request: LoadLemmaForPatchRequest<L>,
	): Promise<LemmaPatchSlice<L>>;

	loadNewNoteContext(
		request: LoadNewNoteContextRequest<L>,
	): Promise<NewNoteSlice<L>>;

	loadCleanupRelationsContext(
		request: LoadCleanupRelationsContextRequest<L>,
	): Promise<CleanupRelationsSlice<L>>;

	commitChanges(request: CommitChangesRequest<L>): Promise<CommitChangesResult>;
};

export type DumdictServiceConfig<L extends SupportedLanguage> = {
	language?: L;
};

export type CreateDumdictServiceOptions<L extends SupportedLanguage> = {
	language: L;
	storage: DumdictStoragePort<L>;
	config?: DumdictServiceConfig<L>;
};
