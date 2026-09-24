import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

import type { DumdictPendingSemanticRelation } from "../domain-types";

export type OwnedSurfaceDraft<out L extends Dumling.Language> = {
	surface: Dumling.Surface<L>;
	note: {
		attestedTranslations: string[];
		attestations: string[];
		notes: string;
	};
};

export type DumdictReadingDraft<out L extends Dumling.Language> = {
	reading: Dumling.Reading<L>;
	note: {
		attestedTranslations: string[];
		attestations: string[];
		notes: string;
	};
	ownedSurfaces?: OwnedSurfaceDraft<L>[];
	relations?: DumdictSemanticRelationDraft<L>[];
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
