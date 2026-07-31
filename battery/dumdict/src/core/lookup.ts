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
		candidates: slice.candidates.map(({ reading, relationNotes }) => ({
			reading: reading.reading,
			note: {
				attestedTranslations: reading.attestedTranslations,
				attestations: reading.attestations,
				notes: reading.notes,
				relations: relationNotes,
			},
		})),
	};
}

export function lookupRelationsCleanupInfo<L extends SupportedLanguage>(
	slice: RelationsCleanupInfoSlice<L>,
): GetInfoForRelationsCleanupResult<L> {
	const pendingRefsById = new Map(
		slice.pendingRefs.map(
			(pendingRef) => [pendingRef.pendingId, pendingRef] as const,
		),
	);

	return {
		revision: slice.revision,
		canonicalForm: slice.canonicalForm,
		candidateLemmas: slice.candidateLemmas.map(({ lemma }) => lemma),
		pendingRelations: slice.pendingRelations.map((relation) => {
			const pendingRef = pendingRefsById.get(relation.targetPendingId);
			if (!pendingRef) {
				throw new Error(
					"relations cleanup slice relation target pending ref is missing.",
				);
			}

			return {
				relationFamily: relation.relationFamily,
				...(relation.relationFamily === "lexical"
					? { sourceReading: relation.sourceReading }
					: {
							sourceLemma: relation.sourceLemma,
						}),
				pendingRef,
				relation: relation.relation,
			} as GetInfoForRelationsCleanupResult<L>["pendingRelations"][number];
		}),
	};
}
