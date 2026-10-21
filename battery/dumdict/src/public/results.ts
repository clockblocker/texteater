import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
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

/**
 * A stored claim whose target its slice's relation inventory doesn't hold,
 * because the dictionary no longer does (system ADR 0011). Every removal
 * moves the claims on what it removes, so only data written before that
 * rule holds one. The plan goes on around the claim and reports it, and the
 * host may retract it.
 */
export type DanglingRelationClaim<L extends Dumling.Language> = {
	kind: "danglingRelationClaim";
	reading: Dumling.Reading<L>;
	relation: Dumrel.DirectSemanticRelation;
	target:
		| { kind: "lemma"; lemma: Dumling.Lemma<L> }
		| { kind: "reading"; reading: Dumling.Reading<L> };
};

/** Stored data a plan worked around, reported beside the plan. */
export type DumdictPlanIssue<L extends Dumling.Language> =
	DanglingRelationClaim<L>;
