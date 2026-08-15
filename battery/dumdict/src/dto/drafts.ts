import type { SemanticRelation } from "dumrel";
import type { SupportedLanguage, Surface } from "../dumling";
import type { DumdictPendingSemanticRelation } from "./pending";
import type { Reading } from "./reading";

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
			relation: SemanticRelation;
			target: { kind: "existing"; reading: Reading<L> };
	  }
	| {
			target: {
				kind: "pending";
				pending: DumdictPendingSemanticRelation<L>;
			};
	  };
