import type { DirectSemanticRelation } from "dumrel";
import type { Lemma, Reading, SupportedLanguage, Surface } from "../dumling";
import type { DumdictPendingSemanticRelation } from "./pending";

export type OwnedSurfaceDraft<L extends SupportedLanguage> = {
	surface: Surface<L>;
	note: {
		attestedTranslations: string[];
		attestations: string[];
		notes: string;
	};
};

export type DumdictReadingDraft<L extends SupportedLanguage> = {
	reading: Reading<L>;
	note: {
		attestedTranslations: string[];
		attestations: string[];
		notes: string;
	};
	ownedSurfaces?: OwnedSurfaceDraft<L>[];
	relations?: DumdictSemanticRelationDraft<L>[];
};

export type DumdictSemanticRelationDraft<L extends SupportedLanguage> =
	| {
			relation: DirectSemanticRelation;
			target: { kind: "existing"; lemma: Lemma<L> };
	  }
	| {
			target: {
				kind: "pending";
				pending: DumdictPendingSemanticRelation<L>;
			};
	  };
