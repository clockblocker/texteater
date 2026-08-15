import type { SupportedLanguage } from "../dumling";
import type {
	FindStoredReadingsResult,
	GetInfoForRelationsCleanupResult,
} from "../public";
import type {
	RelationsCleanupInfoSlice,
	StoredReadingsSlice,
} from "../storage";

export function lookupStoredReadings<L extends SupportedLanguage>(
	slice: StoredReadingsSlice<L>,
): FindStoredReadingsResult<L> {
	return {
		revision: slice.revision,
		candidates: slice.candidates.map(({ reading }) => ({
			reading: reading.reading,
			note: {
				attestedTranslations: reading.attestedTranslations,
				attestations: reading.attestations,
				notes: reading.notes,
				semanticRelations: reading.knowledge?.semanticRelations,
			},
		})),
	};
}

export function lookupRelationsCleanupInfo<L extends SupportedLanguage>(
	slice: RelationsCleanupInfoSlice<L>,
): GetInfoForRelationsCleanupResult<L> {
	return {
		revision: slice.revision,
		canonicalForm: slice.canonicalForm,
		candidateLemmas: slice.candidateLemmas.map(({ lemma }) => lemma),
		pendingRelations: slice.pendingRelations,
	};
}
