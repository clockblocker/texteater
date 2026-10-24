import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

import type {
	AttestationLink,
	DumdictPendingSemanticRelation,
} from "../domain-types";

export type OwnedSurfaceDraft<out L extends Dumling.Language> = {
	surface: Dumling.Surface<L>;
	note: {
		attestedTranslations: string[];
		attestations: string[];
		notes: string;
	};
};

/**
 * A new Reading Entry, with the Surfaces its Lemma comes to own and the
 * relations and Paradigm Changes its Knowledge Production wrote.
 *
 * @remarks Each Attestation Link names the draft's Reading and a Surface of
 * `ownedSurfaces` or one its Lemma already owns. `paradigmChanges` apply to
 * the Lemma's Paradigm with the new Reading among its Readings (system ADR
 * 0048).
 */
export type DumdictReadingDraft<out L extends Dumling.Language> = {
	reading: Dumling.Reading<L>;
	note: {
		attestedTranslations: string[];
		attestationLinks: AttestationLink<L>[];
		notes: string;
	};
	ownedSurfaces?: OwnedSurfaceDraft<L>[];
	relations?: DumdictSemanticRelationDraft<L>[];
	paradigmChanges?: Dumrel.ParadigmChange[];
};

export type DumdictSemanticRelationDraft<L extends Dumling.Language> =
	| {
			relation: Dumrel.DirectSemanticRelation;
			target: { kind: "existing"; lemma: Dumling.Lemma<L> };
	  }
	| {
			target: {
				kind: "pending";
				pending: DumdictPendingSemanticRelation<L>;
			};
	  };
