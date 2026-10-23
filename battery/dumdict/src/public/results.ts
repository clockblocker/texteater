import type * as Dumling from "dumling/types";
import type { AttestationLink } from "../domain-types";
import type { SurfaceId } from "../dumling-id";

export type AffectedDictionaryEntities<L extends Dumling.Language> = {
	lemmas?: Dumling.Lemma<L>[];
	readings?: Dumling.Reading<L>[];
	surfaceIds?: SurfaceId<L>[];
	pendingIds?: string[];
	/**
	 * What the plan deletes. The plan already moves the claims other Readings
	 * held on it. A host plans `reevaluateShadows` with the removed Lemmas
	 * once the plan has committed, from a slice it loads then
	 * (system ADR 0011).
	 */
	removed?: {
		lemmas?: Dumling.Lemma<L>[];
		readings?: Dumling.Reading<L>[];
		surfaceIds?: SurfaceId<L>[];
		attestationLinks?: AttestationLink<L>[];
	};
};

export type MutationSummary = {
	message: string;
};

export type MutationRejectedCode =
	| "readingAlreadyExists"
	| "readingEntryConflict"
	| "ownedSurfaceAlreadyExists"
	| "occurrenceAttestedElsewhere"
	| "readingMissing"
	| "invalidDraft"
	| "invalidRequest"
	| "selfRelation"
	| "relationConflict"
	| "relationTargetMissing";
