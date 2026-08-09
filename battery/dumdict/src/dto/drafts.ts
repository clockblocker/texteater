import type { ProposedRelation } from "dumrel";
import type { SupportedLanguage, Surface } from "../dumling";
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
	relations?: ProposedRelation<L>[];
};
