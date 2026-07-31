import type { SupportedLanguage, Surface } from "../dumling";
import type { Reading } from "./reading";
import type { ProposedRelation } from "./relations";

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
	relations?: ProposedRelation<L>[];
};
