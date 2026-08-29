import type { Lemma, SupportedLanguage } from "dumling/types";
import type { Reading } from "../dto";
import type {
	CommitChangesRequest,
	CommitChangesResult,
	CreateDumdictServiceOptions,
	DumdictPlan,
} from "../storage";
import type {
	CleanupRelationsSlice,
	LoadReadingEntryContextRequest,
	ReadingEntryContext,
	ReadingPatchSlice,
	RelationsCleanupInfoSlice,
	StoredReadingsSlice,
} from "../storage/slices";

export type DumdictSliceValidation<L extends SupportedLanguage> = {
	readonly storedReadings: (
		slice: StoredReadingsSlice<L>,
		requestedLemma?: Lemma<L>,
	) => void;
	readonly readingPatch: (
		slice: ReadingPatchSlice<L>,
		requestedReading?: Reading<L>,
	) => void;
	readonly readingEntryContext: (
		context: ReadingEntryContext<L>,
		request: LoadReadingEntryContextRequest<L>,
	) => void;
	readonly relationsCleanupInfo: (
		slice: RelationsCleanupInfoSlice<L>,
		requestedCanonicalForm?: string,
	) => void;
	readonly cleanupRelations: (slice: CleanupRelationsSlice<L>) => void;
	readonly plan: (value: unknown) => DumdictPlan<L>;
	readonly commitRequest: (value: unknown) => CommitChangesRequest<L>;
	readonly commitResult: (value: unknown) => CommitChangesResult;
};

export type DumdictServiceRuntimeOptions<L extends SupportedLanguage> =
	CreateDumdictServiceOptions<L> & {
		readonly sliceValidation: DumdictSliceValidation<L>;
	};
