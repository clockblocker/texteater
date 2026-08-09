import type { LexicalRelation, MorphologicalRelation } from "dumrel";
import type {
	Lemma,
	LemmaFamilyFor,
	LemmaKindFor,
	SupportedLanguage,
} from "../dumling";
import type { Reading } from "./reading";

export type PendingEntryId<L extends SupportedLanguage> = string & {
	readonly __pendingEntryIdBrand?: unique symbol;
	readonly __language?: L;
};

export type PendingEntryIdentity<L extends SupportedLanguage> = {
	language: L;
	canonicalForm: string;
	family: LemmaFamilyFor<L>;
	kind: LemmaKindFor<L, LemmaFamilyFor<L>>;
};

export type PendingEntryRef<L extends SupportedLanguage> =
	PendingEntryIdentity<L> & {
		pendingId: PendingEntryId<L>;
	};

export type PendingEntryRelation<L extends SupportedLanguage> =
	| {
			sourceReading: Reading<L>;
			relationFamily: "lexical";
			relation: LexicalRelation;
			targetPendingId: PendingEntryId<L>;
	  }
	| {
			sourceLemma: Lemma<L>;
			relationFamily: "morphological";
			relation: MorphologicalRelation;
			targetPendingId: PendingEntryId<L>;
	  };
