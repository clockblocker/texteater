import type { Lemma, SupportedLanguage, Surface } from "../dumling";
import type { ProposedRelation } from "./relations";

export type OwnedSurfaceDraft<L extends SupportedLanguage> = {
	surface: Surface<L>;
	note: {
		attestedTranslations: string[];
		attestations: string[];
		notes: string;
	};
};

export type DumdictEntryDraft<L extends SupportedLanguage> = {
	lemma: Lemma<L>;
	note: {
		attestedTranslations: string[];
		attestations: string[];
		notes: string;
	};
	ownedSurfaces?: OwnedSurfaceDraft<L>[];
	relations?: ProposedRelation<L>[];
};

