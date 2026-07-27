import type {
	RelationsCleanupInfoSlice,
	StoredLemmaSensesSlice,
} from "../storage";
import type { SupportedLanguage } from "../dumling";
import type {
	FindStoredLemmaSensesResult,
	GetInfoForRelationsCleanupResult,
} from "../public";

export function lookupStoredLemmaSenses<L extends SupportedLanguage>(
	slice: StoredLemmaSensesSlice<L>,
): FindStoredLemmaSensesResult<L> {
	return {
		revision: slice.revision,
		candidates: slice.candidates.map(({ entry, relationNotes }) => ({
			lemmaId: entry.id,
			note: {
				lemma: entry.lemma,
				attestedTranslations: entry.attestedTranslations,
				attestations: entry.attestations,
				notes: entry.notes,
				relations: relationNotes,
			},
		})),
	};
}

export function lookupRelationsCleanupInfo<L extends SupportedLanguage>(
	slice: RelationsCleanupInfoSlice<L>,
): GetInfoForRelationsCleanupResult<L> {
	const pendingRefsById = new Map(
		slice.pendingRefs.map((pendingRef) => [pendingRef.pendingId, pendingRef] as const),
	);

	return {
		revision: slice.revision,
		canonicalLemma: slice.canonicalLemma,
		candidateLemmaIds: slice.candidateLemmas.map(({ id }) => id),
		pendingRelations: slice.pendingRelations.map((relation) => {
			const pendingRef = pendingRefsById.get(relation.targetPendingId);
			if (!pendingRef) {
				throw new Error(
					"relations cleanup slice relation target pending ref is missing.",
				);
			}

			return {
				sourceLemmaId: relation.sourceLemmaId,
				pendingRef,
				relation: relation.relation,
			};
		}),
	};
}
